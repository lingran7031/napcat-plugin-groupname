import schedule from 'node-schedule';
import { pluginState } from '../core/state';
import { ruleEngine } from '../core/rule-engine';
import { Rule } from '../types';

class SchedulerService {
    private jobs: Map<string, schedule.Job> = new Map();

    /**
     * 初始化调度服务
     */
    init() {
        this.reloadJobs();
        pluginState.logger.info('调度服务已启动');
    }

    /**
     * 清理所有任务（用于插件卸载）
     */
    clearJobs() {
        for (const [id, job] of this.jobs) {
            job.cancel();
        }
        this.jobs.clear();
        // 这里的 logger 可能已经不可用了（如果在 cleanup 之后调用），所以最好不打日志或用 console
        // pluginState.logger.debug('所有定时任务已停止'); 
    }

    /**
     * 重新加载所有任务
     * 当配置变更时调用
     */
    reloadJobs() {
        // 先清理现有任务
        this.clearJobs();

        const rules = pluginState.config.rules || [];
        let count = 0;
        
        rules.forEach(rule => {
            if (rule.enabled) {
                this.scheduleRule(rule);
                count++;
            }
        });
        
        if (count > 0) {
            pluginState.logger.info(`已加载 ${count} 个定时任务`);
        }
    }

    /**
     * 调度单个规则
     */
    private scheduleRule(rule: Rule) {
        try {
            const job = schedule.scheduleJob(rule.cron, async () => {
                // 双重检查：如果插件已经被卸载（ctx 为空），则不执行
                // 防止极端的竞态条件
                if (!pluginState.hasCtx()) return;
                
                await this.executeRule(rule);
            });
            
            if (job) {
                this.jobs.set(rule.id, job);
            } else {
                pluginState.logger.warn(`规则 ${rule.name} 调度失败: 无效的 CRON 表达式 ${rule.cron}`);
            }
        } catch (e) {
            pluginState.logger.error(`规则 ${rule.name} 调度出错:`, e);
        }
    }

    /**
     * 立即执行规则
     * @param rule 规则对象
     * @param isTest 是否为测试模式 (测试模式下不检查群启用状态，且只打印日志或返回结果)
     */
    async executeRule(rule: Rule, isTest: boolean = false): Promise<string> {
        // 再次检查 ctx 安全性
        if (!pluginState.hasCtx()) {
             console.warn('[Scheduler] PluginState context is lost, skipping execution.');
             return '';
        }

        pluginState.logger.debug(`开始执行规则: ${rule.name}`);
        try {
            const newName = ruleEngine.execute(rule);
            
            if (isTest) {
                return newName;
            }

            // 并发执行修改
            const promises = rule.targetGroups.map(async (groupId) => {
                // 检查群是否启用插件
                if (!pluginState.isGroupEnabled(groupId)) {
                      return;
                }
                
                try {
                    var result = await pluginState.ctx.actions.call('set_group_name', {
                        group_id: groupId,
                        group_name: newName
                    }, pluginState.ctx.adapterName, pluginState.ctx.pluginManager.config);
                    
                    // 调试模式下输出 API 返回结果
                    if (pluginState.config.debug) {
                        pluginState.logger.debug(`群 ${groupId} API 返回结果:`, JSON.stringify(result));
                    }
                    
                    pluginState.logger.info(`群 ${groupId} 名称已修改为: ${newName}`);
                } catch (e: any) {
                    // 调试模式下输出详细错误信息
                    if (pluginState.config.debug) {
                        pluginState.logger.debug(`群 ${groupId} API 调用异常:`, JSON.stringify(e));
                        
                    }
                    
                    // NapCat 的 set_group_name API 在某些情况下不返回数据，但操作本身是成功的
                    // 这种情况下错误消息会包含 "No data returned"，我们将其视为成功
                    if (e?.message?.includes('No data returned')) {
                        pluginState.logger.info(`群 ${groupId} 名称已修改为: ${newName} (API未返回数据，但操作成功)`);
                    } else {
                        pluginState.logger.error(`群 ${groupId} 名称修改失败:`, e);
                    }
                }
            });
            
            await Promise.all(promises);
            
            // 增加处理计数
            pluginState.incrementProcessed();
            
            return newName;
        } catch (e) {
            pluginState.logger.error(`规则 ${rule.name} 执行出错:`, e);
            throw e;
        }
    }
}

export const schedulerService = new SchedulerService();
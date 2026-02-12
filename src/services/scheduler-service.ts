
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
     * 重新加载所有任务
     * 当配置变更时调用
     */
    reloadJobs() {
        // 取消所有现有任务
        for (const job of this.jobs.values()) {
            job.cancel();
        }
        this.jobs.clear();

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
                    await pluginState.ctx.actions.call('set_group_name', {
                        group_id: groupId,
                        group_name: newName
                    }, pluginState.ctx.adapterName, pluginState.ctx.pluginManager.config);
                    
                    pluginState.logger.info(`群 ${groupId} 名称已修改为: ${newName}`);
                } catch (e) {
                    pluginState.logger.error(`群 ${groupId} 名称修改失败:`, e);
                }
            });
            
            await Promise.all(promises);
            return newName;
        } catch (e) {
            pluginState.logger.error(`规则 ${rule.name} 执行出错:`, e);
            throw e;
        }
    }
}

export const schedulerService = new SchedulerService();

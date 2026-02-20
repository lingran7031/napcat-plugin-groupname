import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';
import { DEFAULT_CONFIG } from '../config';
import type { PluginConfig, GroupConfig } from '../types';

// ==================== 配置清洗工具 ====================

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeConfig(raw: unknown): PluginConfig {
    if (!isObject(raw)) return { ...DEFAULT_CONFIG, groupConfigs: {} };

    const out: PluginConfig = { ...DEFAULT_CONFIG, groupConfigs: {} };

    if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
    if (typeof raw.debug === 'boolean') out.debug = raw.debug;
    if (typeof raw.commandPrefix === 'string') out.commandPrefix = raw.commandPrefix;
    if (typeof raw.cooldownSeconds === 'number') out.cooldownSeconds = raw.cooldownSeconds;

    if (isObject(raw.groupConfigs)) {
        for (const [groupId, groupConfig] of Object.entries(raw.groupConfigs)) {
            if (isObject(groupConfig)) {
                const cfg: GroupConfig = {};
                if (typeof groupConfig.enabled === 'boolean') cfg.enabled = groupConfig.enabled;
                out.groupConfigs[groupId] = cfg;
            }
        }
    }

    if (Array.isArray(raw.rules)) {
        out.rules = raw.rules.map((r: any) => ({
            id: String(r.id || crypto.randomUUID()),
            name: String(r.name || '未命名规则'),
            cron: String(r.cron || '* * * * *'),
            targetGroups: Array.isArray(r.targetGroups) ? r.targetGroups.map(String) : [],
            template: String(r.template || ''),
            script: String(r.script || ''),
            enabled: Boolean(r.enabled),
            priority: Number(r.priority || 0),
        }));
    }

    return out;
}

// ==================== 插件全局状态类 ====================

class PluginState {
    private _ctx: NapCatPluginContext | null = null;
    config: PluginConfig = { ...DEFAULT_CONFIG };
    startTime: number = 0;
    selfId: string = '';
    timers: Map<string, ReturnType<typeof setInterval>> = new Map();
    stats = {
        processed: 0,
        todayProcessed: 0,
        lastUpdateDay: new Date().toDateString(),
    };

    get ctx(): NapCatPluginContext {
        if (!this._ctx) {
            throw new Error('PluginState 尚未初始化，请先调用 init()');
        }
        return this._ctx;
    }

    /** 安全检查 ctx 是否存在 */
    hasCtx(): boolean {
        return this._ctx !== null;
    }

    get logger(): PluginLogger {
        return this.ctx.logger;
    }

    init(ctx: NapCatPluginContext): void {
        this._ctx = ctx;
        this.startTime = Date.now();
        this.loadConfig();
        this.ensureDataDir();
        this.fetchSelfId();
    }

    private async fetchSelfId(): Promise<void> {
        try {
            const res = await this.ctx.actions.call(
                'get_login_info', {}, this.ctx.adapterName, this.ctx.pluginManager.config
            ) as { user_id?: number | string };
            
            // 调试模式下输出 API 返回结果
            if (this.config.debug) {
                this.logger.debug('get_login_info API 返回结果:', JSON.stringify(res));
            }
            
            if (res?.user_id) {
                this.selfId = String(res.user_id);
                this.logger.debug("(｡·ω·｡) 机器人 QQ: " + this.selfId);
            }
        } catch (e) {
            // 调试模式下输出详细错误信息
            if (this.config.debug) {
                this.logger.debug('get_login_info API 调用异常:', JSON.stringify(e));
            }
            this.logger.warn("(；′⌒`) 获取机器人 QQ 号失败:", e);
        }
    }

    cleanup(): void {
        for (const [jobId, timer] of this.timers) {
            clearInterval(timer);
        }
        this.timers.clear();
        this.saveConfig();
        // 只有在保存完配置后，再销毁 ctx
        this._ctx = null;
    }

    private ensureDataDir(): void {
        const dataPath = this.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
    }

    getDataFilePath(filename: string): string {
        const safeFilename = path.basename(filename);
        if (safeFilename !== filename) {
            this.logger.warn(`检测到潜在的路径遍历尝试: ${filename} -> ${safeFilename}`);
        }
        return path.join(this.ctx.dataPath, safeFilename);
    }

    loadDataFile<T>(filename: string, defaultValue: T): T {
        const filePath = this.getDataFilePath(filename);
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            this.logger.warn("(；′⌒`) 读取数据文件 " + filename + " 失败:", e);
        }
        return defaultValue;
    }

    saveDataFile<T>(filename: string, data: T): void {
        const filePath = this.getDataFilePath(filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {
            this.logger.error("(╥﹏╥) 保存数据文件 " + filename + " 失败:", e);
        }
    }

    loadConfig(): void {
        const configPath = this.ctx.configPath;
        try {
            if (configPath && fs.existsSync(configPath)) {
                const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.config = sanitizeConfig(raw);
                if (isObject(raw) && isObject(raw.stats)) {
                    Object.assign(this.stats, raw.stats);
                }
                this.ctx.logger.debug('已加载本地配置');
            } else {
                this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
                this.saveConfig();
                this.ctx.logger.debug('配置文件不存在，已创建默认配置');
            }
        } catch (error) {
            this.ctx.logger.error('加载配置失败，使用默认配置:', error);
            this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
        }
    }

    saveConfig(): void {
        if (!this._ctx) return;
        const configPath = this._ctx.configPath;
        try {
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            const data = { ...this.config, stats: this.stats };
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            this._ctx.logger.error('保存配置失败:', error);
        }
    }

    updateConfig(partial: Partial<PluginConfig>): void {
        this.config = { ...this.config, ...partial };
        this.saveConfig();
    }

    replaceConfig(config: PluginConfig): void {
        this.config = sanitizeConfig(config);
        this.saveConfig();
    }

    updateGroupConfig(groupId: string, config: Partial<GroupConfig>): void {
        this.config.groupConfigs[groupId] = {
            ...this.config.groupConfigs[groupId],
            ...config,
        };
        this.saveConfig();
    }

    isGroupEnabled(groupId: string): boolean {
        return this.config.groupConfigs[groupId]?.enabled !== false;
    }

    incrementProcessed(): void {
        const today = new Date().toDateString();
        if (this.stats.lastUpdateDay !== today) {
            this.stats.todayProcessed = 0;
            this.stats.lastUpdateDay = today;
        }
        this.stats.todayProcessed++;
        this.stats.processed++;
    }

    getUptime(): number {
        return Date.now() - this.startTime;
    }

    getUptimeFormatted(): string {
        const ms = this.getUptime();
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return `${d}天${h % 24}小时`;
        if (h > 0) return `${h}小时${m % 60}分钟`;
        if (m > 0) return `${m}分钟${s % 60}秒`;
        return `${s}秒`;
    }
}

export const pluginState = new PluginState();
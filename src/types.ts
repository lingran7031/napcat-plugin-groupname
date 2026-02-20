/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 *
 * 注意：OneBot 相关类型（OB11Message, OB11PostSendMsg 等）
 * 以及插件框架类型（NapCatPluginContext, PluginModule 等）
 * 均来自 napcat-types 包，无需在此重复定义。
 */

// ==================== 插件配置 ====================

/**
 * 插件主配置接口
 * 在此定义你的插件所需的所有配置项
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 调试模式：启用后输出详细日志 */
    debug: boolean;
    /** 触发命令前缀，默认为 #cmd */
    //commandPrefix: string;
    /** 同一命令请求冷却时间（秒），0 表示不限制 */
    /*cooldownSeconds: number;*/
    /** 按群的单独配置 */
    groupConfigs: Record<string, GroupConfig>;
    /** 定时任务规则列表 */
    rules: Rule[];
}

/**
 * 规则定义
 */
export interface Rule {
    /** 唯一标识 */
    id: string;
    /** 规则名称 */
    name: string;
    /** CRON 表达式 */
    cron: string;
    /** 目标群组 ID 列表 */
    targetGroups: string[];
    /** 群名模板 */
    template: string;
    /** JavaScript 脚本 (用于复杂逻辑) */
    script: string;
    /** 是否启用 */
    enabled: boolean;
    /** 优先级 (数字越大优先级越高) */
    priority: number;
}

/**
 * 群配置
 */
export interface GroupConfig {
    /** 是否启用此群的功能 */
    enabled?: boolean;
    // TODO: 在这里添加群级别的配置项
}

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}

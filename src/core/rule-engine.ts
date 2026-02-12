
import { Rule } from '../types';

export class RuleEngine {
    /**
     * 执行规则，计算新的群名称
     * @param rule 规则对象
     * @returns 计算后的群名称
     */
    execute(rule: Rule): string {
        const { script, template } = rule;
        
        // 基础上下文
        const context: Record<string, any> = {
            Date,
            Math,
            console,
            // 可以在这里添加更多帮助函数
        };

        let variables: Record<string, any> = {};
        
        if (script && script.trim()) {
            try {
                // 使用 new Function 执行脚本
                // 脚本中可以使用 context 中的变量
                // 示例: const days = ...; return { days }; 或者 return `名称`;
                
                const keys = Object.keys(context);
                const values = Object.values(context);
                
                // 构造函数: function(Date, Math, console) { ...script... }
                const fn = new Function(...keys, script);
                
                const result = fn(...values);
                
                // 情况 1: 脚本直接返回字符串 -> 作为最终群名
                if (typeof result === 'string') {
                    return result;
                }
                
                // 情况 2: 脚本返回对象 -> 作为模板变量
                if (typeof result === 'object' && result !== null) {
                    variables = { ...variables, ...result };
                }
            } catch (e) {
                throw new Error(`脚本执行出错: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        
        // 如果脚本直接返回了字符串，上面已经处理了。
        // 如果脚本返回对象，或者没有脚本，则使用模板引擎
        return this.applyTemplate(template, variables);
    }

    /**
     * 简单的模板替换
     * 支持 ${varName} 格式
     */
    private applyTemplate(template: string, variables: Record<string, any>): string {
        if (!template) return '';
        
        return template.replace(/\$\{(\w+)\}/g, (match, key) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    }
}

export const ruleEngine = new RuleEngine();

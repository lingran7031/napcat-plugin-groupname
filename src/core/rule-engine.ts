
import vm from 'vm';
import { Rule } from '../types';

export class RuleEngine {
    /**
     * 执行规则，计算新的群名称
     * @param rule 规则对象
     * @returns 计算后的群名称
     */
    execute(rule: Rule): string {
        const { script, template } = rule;
        
        // 基础上下文，使用 Object.create(null) 减少原型链污染风险
        const context: Record<string, any> = Object.create(null);
        context.Date = Date;
        context.Math = Math;
        context.console = console;
        // 可以在这里添加更多帮助函数

        let variables: Record<string, any> = {};
        
        if (script && script.trim()) {
            try {
                // 使用 vm 模块在沙箱中执行脚本，提高安全性
                // 相比 new Function，vm 上下文隔离性更好，防止访问 process 等全局变量
                
                // 构造沙箱上下文
                const sandbox = vm.createContext(context);

                // 包装脚本为立即执行函数以支持 return 语句
                const code = `(function() { ${script} })()`;
                
                // 设置超时时间为 1000ms，防止死循环
                // microtaskMode: 'afterEvaluate' 防止微任务队列阻塞
                const result = vm.runInContext(code, sandbox, { 
                    timeout: 1000,
                    microtaskMode: 'afterEvaluate'
                });
                
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
     * 支持 ${varName} 格式，包括点号和连字符
     */
    private applyTemplate(template: string, variables: Record<string, any>): string {
        if (!template) return '';
        
        return template.replace(/\$\{([\w\-\.]+)\}/g, (match, key) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    }
}

export const ruleEngine = new RuleEngine();

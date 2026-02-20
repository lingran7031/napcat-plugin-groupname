# NapCat 群名称插件项目说明

## 1. 项目概述

本项目是一个 NapCat QQ 机器人的插件，用于自动化管理和设置群名称。

### 功能特性
- **CRON 调度**: 精确到分钟的定时任务。
- **动态变量**: 支持 `${days}` (倒计时/已过天数) 等变量。
- **JS 脚本扩展**: 支持编写 JavaScript 脚本进行复杂逻辑计算 (如获取 API、日期计算等)。
- **WebUI 管理**: 提供可视化的规则管理界面，支持测试运行。

## 2. 环境准备要求
- 确保已安装 Node.js和npm环境

## 3. 快速开始
1. 打开 NapCat WebUI，进入本插件的「扩展页面」页面。
2. 选择 「群名称控制台」插件。
3. 点击「新建规则」。
4. 输入规则名称、CRON 表达式 (如 `0 9 * * *` 每天上午9点)。
5. 选择要应用的目标群组。
6. 编写脚本 (可选) 或直接设置模板。
   - 脚本示例:
     ```javascript
     const days = Math.ceil((new Date('2025-06-07') - Date.now()) / 86400000);
     return { days };
     ```
   - 模板示例: `距离高考还有${days}天`
6. 保存并启用。

### 规则语法
- **CRON**: 标准 CRON 表达式 (分 时 日 月 周)。
- **脚本**: 运行在 Node.js VM 沙箱中的 JavaScript 代码，提供基本的隔离环境。
  - 上下文内置对象: `Date`, `Math`, `console`.
  - 安全说明: 脚本在受限上下文中执行，无法直接访问 `process` 等全局变量，且执行超时时间限制为 1000ms。
  - 返回值:
    - 返回对象 (如 `return { key: 'value' }`)：将合并到模板变量中。
    - 返回字符串 (如 `return '新群名'`)：直接作为新群名，忽略模板。

### 高级脚本示例

#### 自动切换“还有/已过”天数
```javascript
// 目标日期
const target = new Date('2025-06-07');
const now = Date.now();
const oneDay = 86400000;

// 计算差值
let diff = target - now;
let prefix = '还有';
let days = Math.ceil(diff / oneDay);

if (days < 0) {
    prefix = '已过';
    days = Math.floor((now - target) / oneDay);
}

return { prefix, days };
```
**模板**: `项目上线${prefix}${days}天`

## 4. 注意事项
- **权限要求**: 确保机器人有足够权限修改群名称。
- **模板变量**: 所有脚本返回的键值对都可以在模板中使用 `${key}` 引用。

## 5. 贡献与反馈
- 欢迎提交 Pull Request 改进本项目。
- 如有问题或建议，请通过 GitHub Issues 反馈。

## 6. 许可证
本项目基于 MIT 许可证开源。
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


## 3. 代码获取与构建流程

### 3.1 获取项目代码

#### 方法一：Git 克隆
```bash
# 克隆项目代码
git clone <项目仓库地址> napcat-plugin-groupname

# 进入项目目录
cd napcat-plugin-groupname
```

#### 方法二：下载压缩包
1. 从项目仓库下载代码压缩包
2. 解压到本地目录，命名为 `napcat-plugin-groupname`
3. 进入解压后的目录

### 3.2 打包项目

```bash
npm install
npm run build
```

## 4. 部署步骤

### 4.1 构建产物位置
构建成功后，生成的插件文件位于：
```
napcat-plugin-groupname/dist
```

### 4.2 部署插件
- 将生成的 dist/index.mjs 和 package.json 拷贝到 NapCat 的 plugins/auto-tasks/ 目录下。

#
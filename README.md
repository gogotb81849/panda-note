# 熊猫笔记 - Web版

## 项目概述

这是熊猫笔记（原小白航务日志）的Web版本，采用现代化的技术栈构建，支持：

- **前后端分离架构**：Vue3 + Nuxt3 前端，NestJS 后端
- **RBAC权限控制**：支持船管部、主管、船员等多个角色
- **团队数据隔离**：team1/team2/team3 数据完全隔离
- **响应式设计**：完美适配PC和华为MatePad mini平板
- **日历视图**：支持日/周/月视图切换
- **完整的日程管理**：增删改查、状态追踪、优先级管理

## 技术栈

### 前端
- Vue 3.4 + TypeScript
- Nuxt 3 (SSR框架)
- Element Plus (UI组件库)
- Tailwind CSS (样式框架)
- FullCalendar (日历组件)
- Pinia (状态管理)

### 后端
- NestJS 10 (企业级Node框架)
- TypeScript
- Prisma (ORM)
- PostgreSQL (数据库)
- JWT (认证)
- bcrypt (密码加密)

## 快速开始

详细文档请查看 [docs/快速开始.md](./docs/快速开始.md)

## 服务器配置与账号信息

详细的服务器配置、数据库连接、宝塔面板账号等信息请查看：[docs/服务器配置与账号信息.md](./docs/服务器配置与账号信息.md)

### 环境要求

- Node.js 18+
- PostgreSQL 12+
- npm 或 pnpm

### 后端启动

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

后端服务：http://localhost:3000

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端服务：http://localhost:3001

## 测试账号

- **岸基主管**：shore_crew / admin123
- **船舶政委**：ship_political / admin123

## 项目目录

```
nav-log-system/
├── frontend/              # 前端项目
│   ├── pages/            # 页面
│   ├── components/       # 组件
│   ├── layouts/          # 布局
│   ├── stores/           # Pinia状态
│   ├── composables/      # 组合式函数
│   └── types/            # TypeScript类型
├── backend/              # 后端项目
│   ├── src/
│   │   ├── auth/        # 认证模块
│   │   ├── schedule/    # 日程模块
│   │   ├── ship/        # 船舶模块
│   │   └── prisma/      # 数据库服务
│   └── prisma/          # Prisma schema
└── docs/                # 文档
```

## 功能特性

### MVP已实现
- ✅ 用户登录认证（JWT）
- ✅ RBAC权限控制
- ✅ 日程CRUD操作
- ✅ FullCalendar日历视图（日/周/月）
- ✅ 船舶管理
- ✅ 团队数据隔离
- ✅ 响应式布局

### 后续规划
- 📋 数据迁移（从旧版小白航务日志）
- 📋 SOP标准流程库
- 📋 AI工作简报生成
- 📋 公共脱敏案例库
- 📋 操作审计日志
- 📋 PWA离线支持
- 📋 文件上传下载
- 📋 更多角色和功能

## 部署

部署文档请查看 [docs/部署文档.md](./docs/部署文档.md)

服务器配置（宝塔面板）：
- 服务器地址：http://106.14.57.62
- 宝塔端口：8888
- 数据库：PostgreSQL
- 反向代理：Nginx

## 开发规范

### Git分支
- `main` - 主分支，稳定版本
- `dev` - 开发分支
- `feature/*` - 功能分支

### 代码风格
- 前端：ESLint + Prettier
- 后端：ESLint + Prettier
- 提交信息：遵循Conventional Commits

## 联系方式

如有问题请联系项目维护者。

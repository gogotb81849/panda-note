# 熊猫笔记 - 船舶政工多团队智慧台账管理系统

**产品需求文档 (PRD)**

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | 熊猫笔记 (Xiongmao Biji) |
| 文档版本 | V1.0 |
| 最后更新 | 2026-06-06 |
| 文档状态 | 定稿 |

---

## 目录

- [0. 项目总纲](#0-项目总纲)
- [1. 技术架构设计](#1-技术架构设计)
- [2. 数据库设计](#2-数据库设计)
- [3. 前端设计规范](#3-前端设计规范)
- [4. 功能模块详解](#4-功能模块详解)
- [5. 安全规范](#5-安全规范)
- [6. 部署方案](#6-部署方案)
- [7. 开发阶段规划](#7-开发阶段规划)

---

## 0. 项目总纲

### 0.1 产品定位

**熊猫笔记** 是一套面向船舶政工管理的企业级Web应用系统，实现多团队协作、数据安全隔离、智慧沉淀、AI辅助的专业台账管理平台。

### 0.2 核心业务目标

1. **多团队数据隔离**：team1/team2/team3 同库逻辑隔离，数据安全可靠
2. **轮岗追溯**：政委/主管轮岗仅新增履历，历史台账自动匹配当时在岗人员
3. **专业UI设计**：纸张质感、毛玻璃卡片、流畅动效，兼具美感与专业性
4. **多视图日历**：日/周/月三种独立视图，满足不同场景需求
5. **AI智能助手**：对接豆包API，自动生成周/月报工作简报
6. **全设备适配**：MateBook14 + MatePad mini 8.8寸横竖屏 + 全尺寸手机
7. **经验沉淀**：脱敏案例库、SOP流程库，实现组织智慧共享

### 0.3 部署环境

| 组件 | 配置 |
|------|------|
| 服务器 | 宝塔 Linux 服务器 |
| 公网IP | 106.14.57.62 |
| 数据库 | PostgreSQL 12+ |
| 缓存 | Redis 6+ |
| 反向代理 | Nginx |
| 进程管理 | PM2 |
| 证书 | HTTPS（Let's Encrypt） |
| 域名 | 待配置 |

### 0.4 目标设备

| 设备 | 分辨率 | 用途 |
|------|--------|------|
| 华为 MateBook14 | 2520×1680 | 岸基办公 |
| 华为 MatePad mini | 1920×1200（横屏）<br>1200×1920（竖屏） | 移动作业 |
| 全尺寸手机 | 320px～767px | 移动端查看 |

### 0.5 三层数据架构（核心业务规则）

#### 1. 私有业务数据层（团队隔离）

- **范围**：船舶档案、人员履历、日常台账、工伤航病、换班、访船检查
- **隔离方式**：所有业务表增加 `team_code` 字段，底层服务强制过滤
- **访问规则**：
  - 登录账号绑定团队，仅可查看/新增/修改本团队数据
  - 无法查看其他团队任何原始船名、人员、业务明细
  - 一期优先上线 team2，team1/team3 数据结构预埋，菜单灰锁预留

#### 2. 标准 SOP 流程层（全团队共享）

- **范围**：工伤救治、船员换班、登船政工检查等标准流程
- **特性**：
  - 流程文案只标注岗位名称（海务主管/政委等），**不固化人名**
  - 选中船舶 + 业务日期，系统自动匹配当期在岗人员
  - 岗位后缀括号自动填充：`海务主管（张三）`
  - 全团队均可查阅，授权用户可提交优化建议
  - 管理员审核后全平台实时生效

#### 3. 脱敏经验知识层（全团队开放）

- **触发**：工单标记「已办结」后自动生成
- **脱敏规则**：
  - ✅ 保留：事件分类、处置思路、处理步骤、避坑经验、优化方案
  - ❌ 屏蔽：团队标识、船名、具体人名、精确发生日期
- **用途**：三团队全员可检索借鉴同类事件处理经验，实现组织智慧沉淀

---

## 1. 技术架构设计

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         前端层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   PC端UI     │  │ 平板横屏UI  │  │ 平板竖屏UI  │     │
│  │  (Nuxt 3)    │  │  (Nuxt 3)   │  │  (Nuxt 3)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS + JWT
┌─────────────────────────────────────────────────────────────┐
│                       网关层 (Nginx)                         │
│              负载均衡 + 静态资源 + HTTPS                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    后端服务层 (NestJS)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Auth    │ │ Schedule │ │   Ship   │ │   AI     │      │
│  │  认证    │ │  台账    │ │  船舶    │ │  简报    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    数据层                                     │
│  ┌──────────────┐  ┌─────────────────┐                     │
│  │  PostgreSQL  │  │      Redis      │                     │
│  │   主数据库   │  │   会话/缓存     │                     │
│  └──────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4+ | 核心框架 |
| Nuxt | 3.8+ | SSR框架、路由、构建 |
| TypeScript | 5.3+ | 类型安全 |
| Element Plus | 2.4+ | UI组件库 |
| TailwindCSS | 3.4+ | 响应式样式框架 |
| FullCalendar | 6.1+ | 日历组件 |
| Pinia | 2.1+ | 状态管理 |
| Axios | 1.6+ | HTTP请求 |
| Day.js | 1.11+ | 日期处理 |
| ECharts | 5.4+ | 数据可视化（预留） |

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 运行时 |
| NestJS | 10.3+ | 企业级后端框架 |
| TypeScript | 5.3+ | 类型安全 |
| Prisma | 5.7+ | ORM、数据迁移 |
| PostgreSQL | 12+ | 关系数据库 |
| Redis | 7.0+ | 缓存、会话 |
| JWT | jsonwebtoken | 身份认证 |
| bcrypt | 5.1+ | 密码加密 |
| PM2 | 5.3+ | 进程管理 |

### 1.3 后端分层架构

```
src/
├── common/              # 公共模块
│   ├── decorators/      # 自定义装饰器
│   ├── guards/          # 守卫（认证、权限）
│   ├── interceptors/    # 拦截器
│   ├── filters/         # 异常过滤器
│   └── pipes/           # 参数验证管道
├── modules/
│   ├── auth/            # 认证模块
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   ├── schedule/        # 日程台账模块
│   │   ├── schedule.controller.ts
│   │   ├── schedule.service.ts
│   │   └── dto/
│   ├── ship/            # 船舶模块
│   │   ├── ship.controller.ts
│   │   ├── ship.service.ts
│   │   └── dto/
│   ├── staff/           # 人员履历模块
│   ├── sop/             # SOP流程模块
│   ├── case/            # 公共案例模块
│   ├── ai/              # AI简报模块
│   └── system/          # 系统管理模块
└── prisma/              # 数据库服务
    ├── prisma.service.ts
    └── schema.prisma
```

---

## 2. 数据库设计

### 2.1 数据库设计原则

1. **所有业务表必须包含 `team_code` 字段**（除全团队共享表）
2. **使用枚举约束**确保数据一致性
3. **软删除**（可选，使用 `deleted_at` 字段）
4. **所有表必须有 `created_at` 和 `updated_at`**
5. **索引优化**：team_code、日期、状态字段必须建索引

### 2.2 核心数据表

#### 表 2.2.1 `users` - 用户账号表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| username | VARCHAR(50) | 登录账号 | UNIQUE, NOT NULL |
| password | VARCHAR(255) | bcrypt加密密码 | NOT NULL |
| real_name | VARCHAR(50) | 真实姓名 | NOT NULL |
| team_code | ENUM | 所属团队 | 'team1','team2','team3' |
| role | ENUM | 用户角色 | 见角色枚举 |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |
| last_login_at | TIMESTAMP | 最后登录时间 | NULLABLE |
| login_fail_count | INT | 登录失败次数 | DEFAULT 0 |
| locked_until | TIMESTAMP | 锁定截止时间 | NULLABLE |

**角色枚举 (UserRole)：**

| 角色值 | 说明 | 备注 |
|--------|------|------|
| `super_admin` | 集团管理员 | 预留，二期开发 |
| `team_admin` | 团队管理员 | 预留，二期开发 |
| `shore_crew` | 岸基船工主管 | MVP核心角色 |
| `shore_marine` | 岸基海务主管 | 预留 |
| `shore_engineer` | 岸基机务主管 | 预留 |
| `shore_electric` | 岸基电气主管 | 预留 |
| `ship_political` | 船舶政委 | MVP核心角色 |
| `ship_captain` | 船长 | 预留 |
| `ship_engineer` | 轮机长 | 预留 |

**索引：**
- `idx_team_code`: `(team_code)`
- `idx_username`: `(username)`

---

#### 表 2.2.2 `ships` - 船舶档案表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| team_code | ENUM | 所属团队 | 'team1','team2','team3' |
| cn_shipname | VARCHAR(100) | 中文船名 | NOT NULL |
| en_shipname | VARCHAR(100) | 英文船名 | NULLABLE |
| flag_country | VARCHAR(50) | 船旗国 | NULLABLE |
| port_registry | VARCHAR(100) | 船籍港 | NULLABLE |
| build_year | INT | 建造年份 | NULLABLE |
| ship_age | INT | 船龄（动态计算）| VIRTUAL/计算字段 |
| send_company | VARCHAR(50) | 归口派员公司 | NULLABLE |
| send_rule_note | TEXT | 派员备注 | NULLABLE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |

**唯一约束：** `(team_code, cn_shipname)`

**索引：**
- `idx_team_code`: `(team_code)`

---

#### 表 2.2.3 `staff_history` - 人员任职履历时序表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| team_code | ENUM | 所属团队 | 'team1','team2','team3' |
| ship_id | BIGINT | 关联船舶ID | FOREIGN KEY -> ships.id |
| post_name | VARCHAR(50) | 岗位名称 | NOT NULL |
| staff_name | VARCHAR(50) | 人员姓名 | NOT NULL |
| start_date | DATE | 任职起始日期 | NOT NULL |
| end_date | DATE | 离任日期（在岗为NULL） | NULLABLE |
| handover_note | TEXT | 交接备注 | NULLABLE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |

**索引：**
- `idx_team_ship`: `(team_code, ship_id)`
- `idx_post_date`: `(team_code, ship_id, post_name, start_date, end_date)`

**业务规则：**
- 人员换岗**仅新增记录**，不修改旧数据
- 查询时根据「台账登记日期」筛选 `start_date ≤ record_date ≤ end_date` 的在岗人员

---

#### 表 2.2.4 `schedules` - 日常工作流水台账表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| team_code | ENUM | 所属团队 | 'team1','team2','team3' |
| record_date | DATE | 事件登记日期 | NOT NULL |
| ship_id | BIGINT | 关联船舶ID | FOREIGN KEY -> ships.id, NULLABLE |
| first_type | VARCHAR(50) | 一级事项分类 | NOT NULL |
| second_type | VARCHAR(50) | 二级事项分类 | NOT NULL |
| standard_flow_id | BIGINT | 关联SOP流程ID | FOREIGN KEY -> sop_flows.id, NULLABLE |
| event_detail | TEXT | 事件详情（手写区域）| NULLABLE |
| start_time | DATETIME | 事件开始时间 | NULLABLE |
| end_time | DATETIME | 事件结束时间 | NULLABLE |
| finish_status | ENUM | 办结状态 | 'pending','in_progress','completed','cancelled' |
| priority | ENUM | 优先级 | 'urgent','important','normal','low' |
| created_by | BIGINT | 创建人ID | FOREIGN KEY -> users.id |
| assigned_to | BIGINT | 分配给用户ID | FOREIGN KEY -> users.id, NULLABLE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |

**索引：**
- `idx_team_date`: `(team_code, record_date)`
- `idx_team_ship`: `(team_code, ship_id)`
- `idx_team_status`: `(team_code, finish_status)`
- `idx_team_priority`: `(team_code, priority)`

---

#### 表 2.2.5 `sop_flows` - SOP标准流程字典表（全团队共享）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| flow_name | VARCHAR(100) | 流程名称 | NOT NULL |
| flow_content | TEXT | 流程正文（岗位名称占位） | NOT NULL |
| first_type | VARCHAR(50) | 关联一级分类 | NULLABLE |
| second_type | VARCHAR(50) | 关联二级分类 | NULLABLE |
| updated_by | BIGINT | 最后更新人ID | FOREIGN KEY -> users.id, NULLABLE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |

**注意：** 此表**无 `team_code` 字段**，全团队共享

---

#### 表 2.2.6 `public_cases` - 公共脱敏案例知识库（全团队共享）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| from_record_id | BIGINT | 源工单ID（后台溯源） | FOREIGN KEY -> schedules.id, NULLABLE |
| case_type | VARCHAR(50) | 事项分类 | NOT NULL |
| case_content | TEXT | 脱敏后处置经验 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |

**注意：** 此表**无 `team_code` 字段**，全团队共享

**脱敏规则：**
- ❌ 移除：team_code、ship_id、船名、具体人名、精确日期
- ✅ 保留：事件分类、处置思路、处理步骤、避坑经验、优化方案

---

#### 表 2.2.7 `dict_categories` - 通用分类字典表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| team_code | ENUM | 所属团队（可为NULL表示全团队共享） | NULLABLE |
| category_type | VARCHAR(50) | 分类类型：'first_type'/'second_type' | NOT NULL |
| category_name | VARCHAR(50) | 分类名称 | NOT NULL |
| parent_id | BIGINT | 父级分类ID | NULLABLE |
| sort_order | INT | 排序号 | DEFAULT 0 |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |

**索引：**
- `idx_team_type`: `(team_code, category_type)`

---

#### 表 2.2.8 `operation_logs` - 系统操作日志表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| user_id | BIGINT | 操作人ID | FOREIGN KEY -> users.id |
| team_code | ENUM | 所属团队 | NOT NULL |
| operation_type | VARCHAR(50) | 操作类型：'create','update','delete','export','login' | NOT NULL |
| operation_content | TEXT | 操作内容简述 | NULLABLE |
| ip_address | VARCHAR(50) | 客户端IP | NULLABLE |
| user_agent | TEXT | 浏览器UA | NULLABLE |
| request_params | JSON | 请求参数（脱敏）| NULLABLE |
| created_at | TIMESTAMP | 操作时间 | DEFAULT NOW() |

**索引：**
- `idx_team_user`: `(team_code, user_id)`
- `idx_created_at`: `(created_at DESC)`

---

#### 表 2.2.9 `ai_configs` - AI配置表

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 自增主键 | PRIMARY KEY |
| team_code | ENUM | 所属团队 | NOT NULL |
| api_key | VARCHAR(255) | 豆包API Key（加密存储） | NOT NULL |
| api_endpoint | VARCHAR(255) | API端点 | NOT NULL |
| model_name | VARCHAR(100) | 模型名称 | DEFAULT 'doubao-pro' |
| created_at | TIMESTAMP | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新时间 | ON UPDATE NOW() |

---

### 2.3 数据迁移策略

从旧版「小白航务日志」SQLite迁移至PostgreSQL的方案：

1. **数据提取**：编写脚本读取SQLite数据库
2. **数据清洗**：字段映射、格式转换、编码处理
3. **数据验证**：完整性检查、一致性校验
4. **分批导入**：使用Prisma事务分批导入，防止锁表
5. **回滚方案**：导入前备份，失败可回滚

---

## 3. 前端设计规范

### 3.1 设计理念

**专业、简洁、高效、美观**

- 参考企业级产品：飞书、Notion、Salesforce
- 强调纸张质感与数字办公的结合
- 动效克制但有品质
- 平板手写体验优化

### 3.2 响应式断点设计

| 断点 | 屏幕宽度 | 设备类型 | 布局模式 |
|------|----------|----------|----------|
| xs | < 480px | 手机竖屏 | 单栏流式 |
| sm | 480px ~ 767px | 大屏手机/小平板 | 单栏流式 |
| md | 768px ~ 1199px | MatePad mini横屏 | 双栏布局 |
| xl | ≥ 1200px | PC / MateBook14 | 多栏并排 |

**Tailwind配置：**
```javascript
// tailwind.config.js
screens: {
  'sm': '480px',
  'md': '768px',
  'xl': '1200px',
}
```

### 3.3 全局视觉规范

#### 3.3.1 配色系统（专业级）

| 色阶 | HEX | 用途 |
|------|-----|------|
| 主色-900 | #2C3E50 | 标题、深色按钮 |
| 主色-700 | #34495E | 侧边栏、主按钮 |
| 主色-500 | #5B7FA6 | 品牌主色、链接、图标 |
| 主色-300 | #95AFC6 | 次要文字、边框 |
| 主色-100 | #E8F0F6 | 背景、浅色卡片 |
| 成功 | #27AE60 | 已完成、成功提示 |
| 警告 | #F39C12 | 进行中、警告提示 |
| 危险 | #E74C3C | 紧急、删除操作 |
| 正文-1 | #1A1A1A | 标题、重要文字 |
| 正文-2 | #4A4A4A | 正文、次要标题 |
| 正文-3 | #808080 | 辅助文字、时间标签 |
| 正文-4 | #B0B0B0 | 占位符、禁用状态 |
| 背景 | #F8F9FA | 页面背景 |
| 卡片 | #FFFFFF | 卡片背景 |
| 边框 | #E5E7EB | 分割线、边框 |

#### 3.3.2 毛玻璃卡片样式（核心视觉）

```css
/* 标准毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover状态 */
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 16px 48px rgba(0, 0, 0, 0.06);
}

/* 平板优化：更大的点击区域 */
@media (max-width: 1199px) {
  .glass-card {
    padding: 16px;
  }
}
```

#### 3.3.3 纸张质感背景

```css
/* 全局纸张背景 */
body {
  background-color: #F8F9FA;
  background-image: 
    radial-gradient(ellipse 100% 80% at 50% 0%, rgba(91, 127, 166, 0.06) 0%, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  background-attachment: fixed;
}
```

#### 3.3.4 字体系统

```css
/* 字体栈 */
body {
  font-family: 
    -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    "Microsoft YaHei",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;
}

/* 行高优化 */
body { line-height: 1.6; }
h1, h2, h3 { line-height: 1.3; }
p { line-height: 1.75; }

/* 平板竖屏增大行高便于手写阅读 */
@media (max-width: 767px) {
  body { line-height: 1.8; }
}
```

#### 3.3.5 触控优化（华为平板专属）

```css
/* 最小触控尺寸 ≥44px */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* 手写输入框优化 */
.handwriting-input {
  min-height: 120px;
  font-size: 16px;
  line-height: 1.8;
  padding: 16px;
}

/* 平板竖屏进一步加高输入框 */
@media (max-width: 767px) {
  .handwriting-input {
    min-height: 200px;
  }
}
```

### 3.4 页面布局规范

#### 3.4.1 全局布局（三态适配）

```
【PC端（≥1200px）】
┌─────────────────────────────────────────────────┐
│  Header (Logo + 用户信息)                       │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │          Main Content                │
│  (固定)  │            (弹性)                    │
│          │                                      │
└──────────┴──────────────────────────────────────┘

【平板横屏（768px～1199px）】
┌─────────────────────────────────────────────────┐
│  Header                                         │
├─────────────────────────────────────────────────┤
│  ☰  │           Main Content                    │
│      │           (双栏布局)                      │
└─────────────────────────────────────────────────┘

【平板竖屏/手机（<768px）】
┌───────────────────────────┐
│  Header (汉堡菜单)        │
├───────────────────────────┤
│                           │
│      Main Content         │
│      (单栏流式)           │
│                           │
└───────────────────────────┘
```

### 3.5 日历视图规范

#### 3.5.1 月视图

- **PC端**：完整6×7网格，事件色块显示优先级
- **平板横屏**：格子尺寸缩小20%，保证整周可见
- **平板竖屏**：竖向滚动，格子尺寸进一步缩小

#### 3.5.2 周视图

- **PC端**：横向全天时间表，左侧时间轴
- **平板横屏**：时间轴缩小，事件卡片紧凑
- **平板竖屏**：每日卡片堆叠，竖向滚动

#### 3.5.3 日视图

- **PC端**：时间轴 + 多列并排（可选）
- **平板横屏**：双列排布
- **平板竖屏**：单列自上而下

### 3.6 交互动效规范

| 动效类型 | 持续时间 | 缓动曲线 |
|----------|----------|----------|
| 页面切换 | 300ms | ease-out |
| 卡片悬浮 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 抽屉滑出 | 250ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 模态框 | 200ms | ease-out |
| 加载状态 | 800ms | ease-in-out (循环) |

---

## 4. 功能模块详解

### 模块 4.1：登录认证模块

**页面：** `/login`

**功能清单：**
1. ✅ 账号密码登录
2. ✅ JWT Token 认证
3. ✅ 登录失败5次锁定30分钟
4. ✅ 记住登录状态（7天免登）
5. ✅ 退出登录

**界面布局：**
- **PC端**：左右分栏，左侧品牌展示，右侧登录表单
- **平板横屏/竖屏**：居中单栏，表单自适应宽度

**安全要求：**
- 密码bcrypt加密存储
- 登录失败日志记录
- Token过期自动刷新

---

### 模块 4.2：台账录入模块（核心高频）

**页面：** `/schedule/new`、`/schedule/edit/:id`

**功能清单：**
1. ✅ 顶部固定毛玻璃船舶信息卡片
2. ✅ 选择船名后自动带出：船旗、船龄、归口公司
3. ✅ 根据登记日期自动匹配当日在岗人员
4. ✅ 选择事项分类自动带出SOP标准流程
5. ✅ 流程文案岗位自动填充在岗人员：`海务主管（张三）`
6. ✅ 大文本输入框适配华为手写笔
7. ✅ 保存后存入本团队私有台账
8. ✅ 标记办结后自动生成脱敏公共案例

**界面布局：**
- **PC端**：多字段横向并排，SOP右侧边栏
- **平板横屏**：两列排布
- **平板竖屏**：全部字段上下堆叠，输入框自动加高

---

### 模块 4.3：高级查询模块

**页面：** `/schedule/search`

**功能清单：**
1. ✅ 毛玻璃抽屉筛选面板
2. ✅ 按船舶查询：船名 + 起止日期
3. ✅ 按事项分类查询：一级 + 二级分类
4. ✅ 混合多条件检索：船名 + 分类 + 时间 + 状态 + 优先级
5. ✅ 查询结果一键导出Excel
6. ✅ 自动携带team_code过滤，只展示当前团队数据

**筛选面板布局：**
- **PC端**：默认展开，右侧边栏
- **平板横竖屏**：默认收起，点击按钮右侧滑出

---

### 模块 4.4：日历视图模块（三个独立视图）

**页面：** 
- `/calendar/day`（日视图）
- `/calendar/week`（周视图）
- `/calendar/month`（月视图）

**功能清单：**
1. ✅ 日视图：按优先级颜色标签区分事项
2. ✅ 周视图：横向整周排布
3. ✅ 月视图：完整日历，点击日期弹窗展示当日台账
4. ✅ 所有视图支持筛选指定船舶、指定事项分类

**布局适配：**
- **PC端**：多卡片并排，周视图横向完整展示
- **平板横屏**：压缩列宽，保证完整展示
- **平板竖屏**：单列堆叠，竖向滚动

---

### 模块 4.5：公共知识库模块

**页面：** `/knowledge`

**功能清单：**
1. ✅ SOP流程浏览区：全平台标准流程查阅
2. ✅ 授权用户在线提交优化建议
3. ✅ 脱敏案例检索区：按事项分类检索全平台经验
4. ✅ 只展示脱敏内容，隐藏敏感信息

**界面布局：**
- **PC端**：左右分栏（左侧分类、右侧内容）
- **平板横竖屏**：单栏上下布局

---

### 模块 4.6：AI工作简报模块

**页面：** `/ai-report`

**功能清单：**
1. ✅ 豆包API配置页（仅管理员可见）
2. ✅ 选择周/月度起止时间
3. ✅ 后端拉取本周期本团队全量台账数据
4. ✅ 封装Prompt调用豆包接口生成工作简报
5. ✅ 毛玻璃弹窗预览、一键复制、导出Word

**Prompt模板示例：**
```
请生成一份船舶政工工作周报，格式规范、文风正式。

统计数据：
- 本周共完成事项：XX件
- 办结率：XX%
- 工伤事件：XX起
- 船员换班：XX人次

重点工作摘要：
{摘要列表}

请以上述内容为基础，生成一份800字左右的正式工作周报。
```

---

### 模块 4.7：系统后台管理模块

**页面：** `/admin`

**功能清单：**
1. ✅ 船舶档案批量导入Excel
2. ✅ 人员履历录入
3. ✅ 分类字典维护
4. ✅ team1/team3 管理菜单预埋（灰化隐藏）
5. ✅ 数据库一键备份SQL
6. ✅ 查看全量操作日志
7. ✅ 集团管理员空白框架预留（二期）

**权限控制：**
- 普通用户：无权限
- 团队管理员：可进入
- 集团管理员：预留

---

## 5. 安全规范

### 5.1 认证安全

| 安全项 | 实现方案 |
|--------|----------|
| 密码加密 | bcrypt，工作因子12 |
| Token | JWT + Refresh Token双Token机制 |
| Token过期 | Access Token 2小时，Refresh Token 7天 |
| 登录锁定 | 连续失败5次锁定30分钟 |
| HTTPS | 强制HTTPS，HSTS开启 |

### 5.2 数据安全

| 安全项 | 实现方案 |
|--------|----------|
| SQL注入 | Prisma参数化查询，禁止拼接SQL |
| XSS防护 | 前端DOMPurify过滤，后端HTML转义 |
| CSRF | SameSite=Lax，CSRF Token（表单） |
| 团队隔离 | 底层服务强制验证team_code，拦截非法请求 |
| 操作审计 | 所有增删改查记录operation_logs表 |

### 5.3 文件上传安全

| 安全项 | 规则 |
|--------|------|
| 允许格式 | jpg, png, pdf, doc, docx, xlsx, xls |
| 文件大小 | 单文件上限10MB |
| 文件名 | 随机重命名，保留原始扩展名 |
| 病毒扫描 | 预留接口（后期集成ClamAV） |

---

## 6. 部署方案

### 6.1 服务器信息

| 项目 | 配置 |
|------|------|
| 服务器IP | 106.14.57.62 |
| 操作系统 | Alibaba Cloud Linux |
| 宝塔面板 | 已安装 |
| 宝塔端口 | 8888 |

### 6.2 部署架构

```
用户请求
    ↓
Nginx (HTTPS, 反向代理, 静态资源)
    ↓
┌──────────┬──────────┐
│  Frontend (Nuxt)  │
│  (SSR/静态)        │
└──────────┴──────────┘
    ↓
┌──────────────────┐
│  Backend (NestJS)│
│  (PM2集群)       │
└──────────────────┘
    ↓
┌──────────┬──────────┐
│PostgreSQL│  Redis   │
│          │          │
└──────────┴──────────┘
```

### 6.3 Nginx配置示例

```nginx
# 强制HTTPS跳转
server {
    listen 80;
    server_name xiongmaobiji.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name xiongmaobiji.example.com;

    # SSL证书（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/xiongmaobiji.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xiongmaobiji.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 前端Nuxt
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 后端API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 文件上传大小限制
    client_max_body_size 20M;
}
```

### 6.4 PM2配置

```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xiongmaobiji-api',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## 7. 开发阶段规划

### 阶段一：MVP核心（已完成）✅

**目标：** 交付可运行的核心功能

**交付内容：**
- ✅ 后端NestJS项目框架
- ✅ 数据库设计 + Prisma Schema
- ✅ JWT认证 + RBAC权限
- ✅ 船舶管理API
- ✅ 日程台账CRUD API
- ✅ 前端Nuxt3项目框架
- ✅ 登录页面
- ✅ 基础布局 + 响应式适配
- ✅ 日历视图（日/周/月）
- ✅ 日程管理页面

**测试账号：**
- 岸基主管：`shore_crew` / `admin123`
- 船舶政委：`ship_political` / `admin123`

---

### 阶段二：完善优化（待开发）

**目标：** 完善功能、优化体验

**开发内容：**
1. 📋 人员履历模块
2. 📋 SOP流程库模块
3. 📋 公共脱敏案例模块（自动生成）
4. 📋 高级查询 + 导出Excel
5. 📋 操作日志模块
6. 📋 纸张质感背景 + 毛玻璃卡片优化
7. 📋 华为平板手写优化
8. 📋 系统管理后台（字典维护、批量导入）

---

### 阶段三：AI集成（待开发）

**开发内容：**
1. 📋 豆包API配置模块
2. 📋 AI工作简报生成
3. 📋 简报导出Word/PDF
4. 📋 Prompt调优

---

### 阶段四：测试与部署（待开发）

**开发内容：**
1. 📋 旧版小白航务日志数据迁移脚本
2. 📋 全面测试（PC/平板横竖屏）
3. 📋 宝塔部署文档
4. 📋 HTTPS配置
5. 📋 用户使用手册

---

### 阶段五：船工主管工作深度融入（已完成）✅

**完成日期：** 2026-06-09

**开发内容：** 详见文档末尾 [5.11 阶段五完成状态](#511-阶段五完成状态已实现)

---

### 阶段六：离线桌面客户端（待开发）

**前置条件：** WEB功能全部完成（阶段一至五）

**目标：** 开发Electron桌面客户端，支持船舶离线环境使用，有网自动同步，断点续传，数据完整性校验。

#### 6.1 核心需求

| 需求 | 说明 | 优先级 |
|------|------|--------|
| **完整离线支持** | 无网络时正常使用全部功能 | **P0** |
| **有网自动同步** | 检测到网络恢复时自动同步到服务器 | **P0** |
| **断点续传** | 网络中断后可继续传输，不丢数据 | **P0** |
| **数据完整性校验** | 传输完成校验数据完整性，防止数据损坏 | **P0** |
| **本地数据库** | SQLite存储，支持复杂查询 | **P0** |
| **Windows安装包** | .exe安装包 + .zip绿色免安装版 | **P1** |
| **手动同步** | 支持手动触发同步 | **P1** |
| **冲突解决** | 多设备编辑同一数据的冲突处理 | **P2** |

#### 6.2 技术架构

```
┌─────────────────────────────────────────────────┐
│  Electron桌面客户端                              │
├─────────────────────────────────────────────────┤
│  渲染进程 (Vue3 + Nuxt3)                        │
│  ├─ 复用现有前端组件（日记/台账/日程等）         │
│  └─ 离线状态UI（同步状态指示器）                 │
├─────────────────────────────────────────────────┤
│  主进程 (Node.js)                               │
│  ├─ SQLite本地数据库 (better-sqlite3)           │
│  ├─ 网络状态检测                                 │
│  ├─ 同步调度器（自动/手动）                      │
│  ├─ 断点续传管理                                 │
│  └─ 数据完整性校验（MD5/SHA256）                 │
├─────────────────────────────────────────────────┤
│  数据同步层                                      │
│  ├─ 增量同步（只同步变更数据）                   │
│  ├─ 分块传输（大数据分块，支持断点续传）         │
│  ├─ 传输校验（每块校验和，全量校验）             │
│  └─ 冲突解决（时间戳优先/手动选择）              │
└─────────────────────────────────────────────────┘
```

#### 6.3 同步机制设计

**6.3.1 同步触发条件**
- 网络恢复自动触发
- 应用启动时检测网络
- 手动点击同步按钮
- 定时同步（每30分钟检测一次）

**6.3.2 断点续传流程**
```
1. 客户端将数据分块（每块100条记录）
2. 每块计算MD5校验和
3. 传输块 + 校验和到服务器
4. 服务器校验后返回ACK
5. 如果传输中断，记录已传输的块ID
6. 网络恢复后，从断点处继续传输
7. 全部块传输完成后，进行全量校验
```

**6.3.3 数据完整性校验**
```
1. 传输前计算全量数据SHA256
2. 传输完成后，服务器重新计算SHA256
3. 比对SHA256，不一致则重新传输
4. 传输成功后，标记数据已同步
```

**6.3.4 冲突解决策略**
- 默认策略：最后编辑时间优先
- 冲突提示：显示冲突数据，用户手动选择
- 日志记录：记录所有冲突及解决结果

#### 6.4 数据模型（本地SQLite）

**复用现有Prisma Schema，转换为SQLite兼容格式：**
- User（用户信息缓存）
- Ship（船舶信息缓存）
- Schedule（日程台账）
- Diary（航海日记）
- DictCategory（分类字典）
- SopFlow（SOP流程）
- PublicCase（案例库）
- PublishTemplate（发布模板）
- ShipTaskStatus（船舶任务状态）
- **SyncLog（同步日志，新增）**

```prisma
model SyncLog {
  id          Int       @id @default(autoincrement())
  syncType    String    // 'upload' / 'download'
  dataType    String    // 'diary' / 'schedule' / ...
  dataId      Int       // 数据ID
  status      String    // 'pending' / 'syncing' / 'completed' / 'failed'
  chunkIndex  Int?      // 分块索引
  totalChunks Int?      // 总分块数
  md5         String?   // 数据MD5
  error       String?   // 错误信息
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([status])
  @@index([dataType, dataId])
}
```

#### 6.5 API扩展（服务端）

**新增同步相关API：**
```
POST   /api/sync/upload           // 上传数据（支持分块）
POST   /api/sync/upload/:id/chunk // 上传数据块
POST   /api/sync/upload/:id/verify// 校验数据完整性
GET    /api/sync/download         // 下载数据（支持分块）
GET    /api/sync/status           // 获取同步状态
POST   /api/sync/conflict/resolve // 解决数据冲突
```

#### 6.6 安装包配置

**Electron Builder配置：**
```json
{
  "appId": "com.panda.navlog",
  "productName": "熊猫笔记",
  "directories": {
    "output": "dist-electron"
  },
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64"] },
      { "target": "portable", "arch": ["x64"] },
      { "target": "zip", "arch": ["x64"] }
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

**输出文件：**
- `熊猫笔记-Setup-x64.exe` - Windows安装包
- `熊猫笔记-Portable-x64.exe` - 绿色便携版
- `熊猫笔记-win-x64.zip` - 绿色免安装版

#### 6.7 开发计划

| 阶段 | 内容 | 工作量 |
|------|------|--------|
| **6.1** | Electron项目搭建 + 基础框架 | 1周 |
| **6.2** | 本地SQLite数据库 + 数据模型 | 1周 |
| **6.3** | 前端组件适配（离线模式） | 1周 |
| **6.4** | 同步机制实现（自动/手动） | 2周 |
| **6.5** | 断点续传 + 数据完整性校验 | 1周 |
| **6.6** | 冲突解决机制 | 1周 |
| **6.7** | 安装包打包 + 测试 | 1周 |
| **总计** | | **约8周** |

#### 6.8 测试重点

| 测试项 | 说明 |
|------|------|
| **离线功能** | 无网络时正常使用全部功能 |
| **网络切换** | 有网/无网切换，自动同步触发 |
| **断点续传** | 传输中断后继续传输，数据不丢失 |
| **数据完整性** | 传输完成校验SHA256，防止数据损坏 |
| **大数据量** | 大量数据同步，分块传输稳定性 |
| **冲突解决** | 多设备编辑同一数据，冲突处理正确 |
| **安装包** | 安装/卸载/绿色版运行正常 |

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| team_code | 团队编码：team1/team2/team3 |
| SOP | Standard Operating Procedure，标准作业流程 |
| RBAC | Role-Based Access Control，基于角色的访问控制 |
| MVP | Minimum Viable Product，最小可行产品 |

### B. 参考文档

- 旧版「小白航务日志」完整需求文档
- 小白航务日志数据库结构
- Element Plus组件文档
- TailwindCSS文档

---

## 阶段五：船工主管工作深度融入（核心优化）

**更新日期：** 2026-06-09

**目标：** 聚焦船工主管、船舶政委两大岗位，将船工主管核心工作职责全面融入熊猫笔记系统，实现党建提质、政委管理优化、船员服务提升、廉洁风险防控、数字化管理升级。

### 5.1 核心需求分析

#### 5.1.1 船工主管工作职责映射

| 船工主管职责 | 系统现有能力 | 优化方案 |
|---|---|---|
| 党建主责落实 | ✅ 日记系统 | 建立党建专属分类体系 |
| 政委全周期管理 | ⚠️ 需增强 | 新增政委履职档案模块 |
| 差异化党建指导 | ❌ 缺失 | 按船舶类型/航线/人员结构推荐分类方案 |
| 纪检监督工作 | ❌ 缺失 | 新增廉洁风险监督台账 |
| 船员思想工作 | ⚠️ 需增强 | 日记支持船员诉求标记与追踪 |
| 应急保障协调 | ⚠️ 需增强 | 新增应急事件记录与闭环管理 |
| 数字化平台应用 | ⚠️ 部分具备 | 数据分析看板 + AI智能辅助 |

#### 5.1.2 现存问题与系统解决方案

| 现存问题 | 系统解决方案 |
|---|---|
| 党建指导同质化，缺少一船一策 | 按船舶档案（船型、航线）推荐专属党建分类模板 |
| 政委管理针对性不足，派前谈话/过程管控薄弱 | 政委履职档案，全周期记录考核 |
| 下沉一线不足，与普通船员沟通少 | 日记支持标记"谈心对象"，统计覆盖范围 |
| 传统台账/邮件报送效率低 | 自动生成周报、在线汇总、智能提醒 |
| 数字化管理能力不足 | 数据看板 + AI分析预警 |

---

### 5.2 分类体系设计（核心基础）

#### 5.2.1 一级分类体系

```
1. 党建工作
2. 船舶政委管理
3. 思想引领与队伍建设
4. 纪律与廉洁监督
5. 安全协同管理
6. 培训与教育
7. 应急保障
8. 综合协调
9. 数字化管理
```

#### 5.2.2 二级分类体系

| 一级分类 | 二级分类 | 说明 |
|---|---|---|
| **党建工作** | 三会一课 | 支部党员大会、支委会、党小组会 |
| | 主题党日 | 每月主题党日活动 |
| | 党员大会 | 全体党员参加的重要会议 |
| | 专题研讨 | 政绩观、党纪等专题研讨 |
| | 政绩观学习 | 正确政绩观学习教育专项 |
| **船舶政委管理** | 新政委传帮带 | 新政委入职辅导、传帮带记录 |
| | 在岗跟踪 | 在岗期间工作表现跟踪 |
| | 履职考核 | 期满考核、评优评先 |
| | 派前谈话 | 上船前谈话、廉政谈话 |
| | 专项帮扶 | 能力薄弱政委专项帮扶 |
| **思想引领与队伍建设** | 谈心谈话 | 与船员一对一谈心 |
| | 人文关怀 | 船员生活关怀、困难帮扶 |
| | 船员诉求 | 收集并解决船员急难愁盼 |
| | 矛盾化解 | 船员间矛盾调解 |
| | 心理疏导 | 船员心理健康关注 |
| **纪律与廉洁监督** | 伙食监督 | 船舶伙食费管理监督 |
| | 经费管理 | 船舶工会经费等监督 |
| | 备件物料 | 备件采购、物料管理监督 |
| | 燃油加装 | 燃油加装过程监督 |
| | 警示教育 | 廉洁警示教育开展 |
| **安全协同管理** | 五防工作 | 防碰撞/防火防爆/防污染/防工伤/防海盗 |
| | 隐患排查 | 安全隐患排查治理 |
| | 应急演练 | 消防、救生等应急演练 |
| | 高风险水域管控 | 波斯湾等高风险水域专项管控 |
| **培训与教育** | 政治学习 | 船员政治理论学习 |
| | 安全培训 | 安全生产培训 |
| | 专项教育 | 党纪、廉政等专项教育 |
| | 基本培训机制 | 集团基本培训机制落实 |
| **应急保障** | 船员换班 | 船员上下船换班协调 |
| | 突发疾病 | 船员突发疾病应急处置 |
| | 家庭变故 | 船员家庭变故关怀协调 |
| | 应急协调 | 其他应急事项协调 |
| **综合协调** | 周报月报 | 工作周报、月报撰写报送 |
| | 材料报送 | 各类专题材料报送 |
| | 船舶对接 | 与船舶日常沟通协调 |
| | 船员公司协调 | 与船员公司对接协调 |
| **数字化管理** | 平台数据录入 | 党建智慧平台、航运管理平台数据录入 |
| | 数据分析 | 利用系统进行工作数据分析 |
| | 智能提醒 | 系统自动提醒待办事项 |

#### 5.2.3 数据模型

**分类字典表 `dict_categories` 已支持一二级分类**，无需新增表结构。

**导入脚本：**
```typescript
// 预设分类数据通过 prisma/seed-categories.ts 导入
// 支持按团队、按船舶类型设置分类模板
```

---

### 5.3 政委履职档案模块

#### 5.3.1 功能描述

为每位船舶政委建立独立履职档案，记录全周期工作情况，支持船工主管对政委进行差异化管理与指导。

#### 5.3.2 数据模型设计

**新增表 `political_officer_profile` - 政委履职档案表**

```prisma
model PoliticalOfficerProfile {
  id            Int       @id @default(autoincrement())
  userId        Int       // 关联用户ID（政委）
  teamCode      TeamCode  // 所属团队
  shipId        Int       // 关联船舶ID
  shipName      String    // 船舶名称（冗余字段，便于查询）
  
  // 任职信息
  periodStart   DateTime  // 任职起始日期
  periodEnd     DateTime? // 任职结束日期（NULL表示在岗）
  isOnBoard     Boolean   @default(true)  // 是否在岗
  
  // 全周期记录
  preBoardTalk  String?   @db.Text        // 派前谈话记录
  mentoring     String?   @db.Text        // 传帮带计划
  assessment    String?   @db.Text        // 考核评价
  issues        String?   @db.Text        // 存在问题
  improvement   String?   @db.Text        // 改进建议
  
  // 统计数据（自动计算）
  diaryCount    Int       @default(0)     // 日记总数
  activeDays    Int       @default(0)     // 活跃天数
  categoryStats Json?     // 分类分布统计
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([teamCode, userId, shipId, periodStart])
  @@index([teamCode, userId])
  @@index([teamCode, shipId])
  @@index([isOnBoard])
}
```

#### 5.3.3 功能清单

| 功能 | 说明 |
|---|---|
| 档案创建 | 政委派前谈话后自动创建档案 |
| 全周期记录 | 关联该政委所有日记、日程、周报 |
| 履职统计 | 自动统计日记数量、分类分布、活跃天数 |
| 考核管理 | 支持填写考核评价、存在问题、改进建议 |
| 差异化帮扶 | 标记薄弱政委，设置专项帮扶计划 |
| 履职档案查看 | 按政委/船舶查看完整履职轨迹 |

#### 5.3.4 API设计

```
POST   /api/political-officer-profiles          // 创建档案
GET    /api/political-officer-profiles           // 列表（支持筛选）
GET    /api/political-officer-profiles/:id       // 详情
PUT    /api/political-officer-profiles/:id       // 更新（考核、帮扶等）
GET    /api/political-officer-profiles/:id/stats // 履职统计
GET    /api/political-officer-profiles/:id/diaries // 关联日记列表
```

#### 5.3.5 前端UI设计

**页面路径：** `/political-officer-profiles`

**页面布局：**
```
┌─────────────────────────────────────────────────┐
│  政委履职档案管理                                │
├─────────────────────────────────────────────────┤
│  筛选：在岗/离任 | 船舶 | 姓名搜索              │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ 张三        │ │ 李四        │ │ 王五        ││
│  │ XX轮 政委   │ │ XX轮 政委   │ │ XX轮 政委   ││
│  │ 在岗 180天  │ │ 在岗 45天   │ │ 已离任      ││
│  │ 日记: 165篇 │ │ 日记: 38篇  │ │ 日记: 92篇  ││
│  │ [查看详情]  │ │ [帮扶计划]  │ │ [查看档案]  ││
│  └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────┘
```

---

### 5.4 发布管理模块（核心功能：船舶动态 + 抵港前检查）

#### 5.4.1 功能描述

船工主管通过统一的发布管理机制，创建并发布两种类型的任务模板：
1. **船舶动态信息模板**：结构化报告模板，所有船舶（可配置）按要求填写
2. **抵港前检查项目模板**：清单式检查模板，ETA前N天自动触发，政委逐项标记完成

两者共用同一套机制：创建标题 → **保存草稿** → 编辑修改 → 发布 → 同步到船舶 → 政委填写/标记 → 数据回传

#### 5.4.2 核心业务流程

```
┌─────────────────────────────────────────────────┐
│  1. 船工主管创建发布模板                         │
│     点击"发布管理"按钮 → 选择类型 → 添加标题      │
│     ↓                                            │
│     [保存草稿] ← 可随时保存，不发布到船舶          │
│     [发布] ← 发布后同步到目标船舶                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  2. 系统同步到目标船舶                           │
│     根据发布设置（所有船/抵港前N天/特定航线等）    │
│     上传服务器 → 目标船舶同步                     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  3. 政委打开日记显示任务                         │
│     - 船舶动态：按要求填写报告                    │
│     - 抵港检查：逐项标记完成状态                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  4. 数据回传，翻牌子视图实时显示                 │
└─────────────────────────────────────────────────┘
```

#### 5.4.3 发布类型对比

| 对比项 | 船舶动态信息 | 抵港前检查项目 |
|------|---|---|
| 用途 | 政委填写结构化报告 | 政委逐项标记完成状态 |
| 数据形式 | 文本报告（动态/换班/安全/伙食/其他） | 清单（完成/未完成 + 完成日期） |
| 触发条件 | 可配置（所有船/特定条件） | 固定（ETA前N天，默认4天） |
| 目标船舶 | 可配置（见5.4.6发布设置） | ETA前N天的船舶 |
| 显示方式 | 日记中的"船舶动态报告"模块 | 日记中的"抵港前检查"模块 |
| 翻牌子显示 | 最新报告摘要 | 完成进度百分比 + 颜色标识 |

#### 5.4.4 数据模型设计

**新增表 `publish_template` - 发布模板表（统一）**

```prisma
model PublishTemplate {
  id            Int       @id @default(autoincrement())
  teamCode      TeamCode  // 所属团队
  
  // 模板类型
  templateType  String    // 'ship_dynamic' 或 'port_call_check'
  
  // 模板定义
  title         String    // 模板标题（由船工主管自定义）
  items         Json      // 模板项列表 [{id, title, type, required}]
  // 示例：船舶动态 - [{id:1, title:"船舶动态", type:"text"}, {id:2, title:"船员换班", type:"text"}]
  // 示例：抵港检查 - [{id:1, title:"船舶证书核查", type:"check"}, {id:2, title:"船员证书核查", type:"check"}]
  
  // 发布设置
  targetShips   Json      // 目标船舶配置 {type:"all"|"eta_before"|"route"|"custom", value:...}
  triggerDays   Int?      // 抵港前N天触发（仅port_call_check类型）
  
  // 状态
  isDraft       Boolean   @default(true)  // 是否草稿
  isPublished   Boolean   @default(false) // 是否已发布
  publishedBy   Int?      // 发布人ID
  publishedAt   DateTime? // 发布时间
  
  // 其他
  sortOrder     Int       @default(0)  // 排序号
  isActive      Boolean   @default(true)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([teamCode])
  @@index([templateType])
  @@index([isDraft])
  @@index([isPublished])
}
```

**新增表 `ship_task_status` - 船舶任务状态表（统一）**

```prisma
model ShipTaskStatus {
  id            Int       @id @default(autoincrement())
  teamCode      TeamCode  // 所属团队
  shipId        Int       // 船舶ID
  
  // 关联模板
  templateId    Int       // 模板ID
  templateType  String    // 'ship_dynamic' 或 'port_call_check'
  
  // 任务数据
  responseData  Json?     // 响应数据
  // 示例：船舶动态 - {船舶动态:"在Galle海域航行", 船员换班:"无", 安全:"正常"}
  // 示例：抵港检查 - [{id:1, completed:true, completedAt:"2026-06-08", note:""}, ...]
  
  // 进度统计（仅port_call_check类型）
  totalItems    Int       @default(0)  // 总项目数
  completedItems Int      @default(0)  // 已完成数
  progress      Float     @default(0)  // 进度百分比 0-100
  
  // 状态
  status        String    @default("pending")  // pending/in_progress/completed
  
  // 响应人
  respondedBy   Int?      // 响应人（政委ID）
  respondedAt   DateTime? // 响应时间
  
  // 触发时间
  triggerDate   DateTime? // 触发日期
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([shipId, templateId])
  @@index([teamCode, shipId])
  @@index([teamCode, templateType])
  @@index([status])
  @@index([progress])
  @@index([triggerDate])
}
```

**在 `ships` 表添加字段：**
```prisma
// 船舶动态信息（从最新报告自动填充）
currentVoyage   String?   // 当前航次
currentLocation String?   // 当前位置
currentStatus   String    @default("voyage") // voyage/anchored/berthed
eta             DateTime? // 预计抵港时间
etaPort         String?   // 目的港
etd             DateTime? // 预计离港时间

// 四岗主管（岸基）
marineSupervisor String?    // 海务主管姓名
engineerSupervisor String?  // 机务主管姓名
electricSupervisor String?  // 电气主管姓名
politicalSupervisor String? // 政工主管姓名

// 当前政委信息
politicalOfficerId Int?     // 政委用户ID
politicalOfficerName String? // 政委姓名
politicalOfficerPhoto String? // 政委照片URL（后续版本）
captainName       String?   // 船长姓名

// 统计信息
lastReportDate  DateTime? // 最后报告日期
```

#### 5.4.5 功能清单

| 功能 | 说明 | 触发方 |
|------|------|--------|
| 创建模板 | 选择类型（动态/检查），添加标题项 | 船工主管 |
| **保存草稿** | **保存但不发布，可随时修改** | **船工主管** |
| 编辑模板 | 修改标题内容、排序、发布设置 | 船工主管 |
| 删除模板 | 删除不需要的模板（草稿/已发布） | 船工主管 |
| 发布模板 | 发布后同步到目标船舶 | 船工主管 |
| 自动触发 | 根据触发条件自动在政委日记中显示 | 系统 |
| 填写/标记 | 填写报告或标记完成状态 | 政委 |
| 进度计算 | 完成数/总数 = 进度百分比（检查类型） | 系统 |
| 实时同步 | 翻牌子视图实时显示进度/最新报告 | 系统 |

#### 5.4.6 发布设置（目标船舶配置）

船工主管发布时可选择目标船舶范围：

| 配置类型 | 说明 | 示例 |
|---|---|---|
| **所有船舶** | 同步到所有船舶 | 适用于通用模板 |
| **ETA前N天** | 仅同步到ETA前N天的船舶 | 默认N=4天 |
| **特定航线** | 仅同步到指定航线的船舶 | 中东航线、东南亚航线等 |
| **特定状态** | 仅同步到特定状态的船舶 | 靠泊中、锚泊中、航行中等 |
| **自定义选择** | 手动选择特定船舶 | 勾选需要同步的船舶 |

**发布设置UI示例：**
```
┌─────────────────────────────────────────────────┐
│  发布设置                                        │
├─────────────────────────────────────────────────┤
│  目标船舶：[所有船舶▼]                           │
│  ┌─────────────────────────────────────────────┐│
│  │ ○ 所有船舶                                  ││
│  │ ○ ETA前 [4] 天的船舶                        ││
│  │ ○ 特定航线：[中东航线▼]                     ││
│  │ ○ 特定状态：[靠泊中▼]                       ││
│  │ ○ 自定义选择：[选择船舶...]                 ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  [保存草稿]  [发布]  [取消]                      │
└─────────────────────────────────────────────────┘
```

#### 5.4.7 进度颜色标识（仅抵港前检查类型）

| 颜色 | 进度范围 | 含义 |
|------|----------|------|
| ⚪ 灰色 | 未开始 | 未到触发时间 |
| 🔴 红色 | 0% | 已触发，未完成任何项 |
| 🟡 黄色 | 1%-99% | 部分完成 |
| 🟢 绿色 | 100% | 全部完成 |

#### 5.4.8 API设计

```
// 发布模板管理（船工主管）
POST   /api/publish-templates               // 创建模板
GET    /api/publish-templates               // 获取模板列表
GET    /api/publish-templates/:id           // 获取模板详情
PUT    /api/publish-templates/:id           // 更新模板
DELETE /api/publish-templates/:id           // 删除模板
POST   /api/publish-templates/:id/draft     // 保存草稿
POST   /api/publish-templates/:id/publish   // 发布模板

// 船舶任务状态管理（政委/系统）
GET    /api/ship-tasks                      // 获取船舶任务列表
PUT    /api/ship-tasks/:id                  // 更新任务状态（填写报告/标记完成）
POST   /api/ship-tasks/trigger              // 触发任务（根据配置条件）

// 翻牌子视图
GET    /api/ships/dynamic-status            // 获取所有船舶动态状态（含检查进度+最新报告）
```

#### 5.4.9 前端UI设计

**船工主管页面 - 发布管理：**

```
┌─────────────────────────────────────────────────┐
│  发布管理                                        │
├─────────────────────────────────────────────────┤
│  [新建船舶动态模板]  [新建抵港前检查模板]        │
├─────────────────────────────────────────────────┤
│  模板列表                                        │
│  ┌─────────────────────────────────────────────┐│
│  │ 序号 | 模板名称 | 类型 | 状态 | 操作        ││
│  │ ─────|──────────|──────|──────|──────────── ││
│  │  1   | 船舶动态报告模板 | 动态 | 已发布 │    ││
│  │  2   | 抵港前检查模板   | 检查 | 已发布 │    ││
│  │  3   | 安全检查专项     | 检查 | 草稿   │    ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  发布记录                                        │
│  ┌─────────────────────────────────────────────┐│
│  │ 发布时间 | 模板名称 | 目标船舶 | 完成进度    ││
│  │ 06-08    | 船舶动态报告 | 所有船舶 | 85%     ││
│  │ 06-07    | 抵港前检查   | ETA前4天 | 62%     ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**船工主管页面 - 创建/编辑模板：**

```
┌─────────────────────────────────────────────────┐
│  新建抵港前检查模板                              │
├─────────────────────────────────────────────────┤
│  模板名称：[抵港前安全检查____________]          │
│  模板类型：○ 船舶动态报告  ● 抵港前检查          │
├─────────────────────────────────────────────────┤
│  检查项目：                                      │
│  ┌─────────────────────────────────────────────┐│
│  │ 1. [船舶证书核查_____________] [删除] [上移]││
│  │ 2. [船员证书核查_____________] [删除] [上移]││
│  │ 3. [港口国文件准备___________] [删除] [上移]││
│  │ 4. [船舶保安计划更新_________] [删除] [上移]││
│  │ 5. [防污染设备检查___________] [删除] [上移]││
│  │                                            ││
│  │ [+ 添加检查项目]                            ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  发布设置：                                      │
│  目标船舶：[ETA前4天的船舶▼]                    │
├─────────────────────────────────────────────────┤
│  [保存草稿]  [发布]  [取消]                      │
└─────────────────────────────────────────────────┘
```

**政委日记页面 - 船舶动态报告模块：**

```
┌─────────────────────────────────────────────────┐
│  📋 船舶动态报告                                │
├─────────────────────────────────────────────────┤
│  船舶动态：远洋湖轮V72航次，Galle海域航行       │
│  船员换班：无                                    │
│  安全生产：情况正常                              │
│  伙食补给：无                                    │
│  其他情况：3名保安携带武器弹药等装备上船         │
├─────────────────────────────────────────────────┤
│  [编辑]  [提交]                                 │
└─────────────────────────────────────────────────┘
```

**政委日记页面 - 抵港前检查模块：**

```
┌─────────────────────────────────────────────────┐
│  📋 抵港前检查项目 - ETA: 2026-06-19 延布       │
├─────────────────────────────────────────────────┤
│  序号 | 检查项目 | 完成状态 | 完成日期 | 备注    │
│  ─────|──────────|──────────|──────────|────────  │
│   1   | 船舶证书核查 | ✅ 已完成 | 06-08 |       │
│   2   | 船员证书核查 | ✅ 已完成 | 06-09 |       │
│   3   | 港口国文件准备 | ⬜ 未完成 | - |          │
│   4   | 船舶保安计划更新 | ⬜ 未完成 | - |        │
│   5   | 防污染设备检查 | ⬜ 未完成 | - |          │
├─────────────────────────────────────────────────┤
│  完成进度：2/5 (40%) 🟡                         │
│  ▓▓░░░░░░░░                                     │
├─────────────────────────────────────────────────┤
│  [右键菜单：标记完成/标记未完成/填写备注]         │
└─────────────────────────────────────────────────┘
```

**翻牌子视图 - 船舶卡片显示：**

```
┌─────────────────────────────────────────────────┐
│  🟢 远洋湖轮  V72航次                           │
├─────────────────────────────────────────────────┤
│  当前位置：Galle海域                             │
│  状态：航行中                                    │
│  ETA：延布 2026-06-19 20:00LT                   │
├─────────────────────────────────────────────────┤
│  船员换班：-  安全：正常  伙食：-                │
├─────────────────────────────────────────────────┤
│  政委：申迅成  船长：[姓名]                      │
│  海务：[姓名]  机务：[姓名]                      │
├─────────────────────────────────────────────────┤
│  📋 抵港检查：2/5 (40%) 🟡                     │
│  ▓▓░░░░░░░░                                     │
│  [查看详情]                                     │
└─────────────────────────────────────────────────┘
```

---

### 5.5 廉洁风险监督台账模块

#### 5.5.1 功能描述

记录船舶高风险领域监督情况，实现事前预防、事中监督、事后核查的闭环管理。

#### 5.4.2 数据模型设计

**新增表 `risk_supervision` - 廉洁风险监督台账表**

```prisma
model RiskSupervision {
  id            Int       @id @default(autoincrement())
  teamCode      TeamCode  // 所属团队
  userId        Int       // 记录人ID
  
  // 关联信息
  shipId        Int       // 关联船舶ID
  shipName      String    // 船舶名称（冗余字段）
  
  // 监督信息
  category      String    // 监督类别：伙食/经费/备件/燃油/其他
  riskLevel     String    // 风险等级：高/中/低
  checkDate     DateTime  // 检查日期
  checkType     String    // 检查类型：例行检查/专项检查/抽查
  
  // 发现问题
  findings      String?   @db.Text  // 发现问题描述
  riskPoints    String[]  // 风险点列表
  evidence      String?   @db.Text  // 证据/附件说明
  
  // 处理状态
  status        String    @default("pending")  // pending/processing/resolved/closed
  handler       String?   // 处理人
  handleDate    DateTime? // 处理日期
  handleResult  String?   @db.Text  // 处理结果
  followUp      String?   @db.Text  // 后续跟进
  
  // 预警信息
  alertLevel    String?   // 预警级别：normal/warning/critical
  alertMessage  String?   // 预警信息
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([teamCode, shipId])
  @@index([teamCode, category])
  @@index([teamCode, riskLevel])
  @@index([teamCode, status])
  @@index([teamCode, checkDate])
}
```

#### 5.5.3 功能清单

| 功能 | 说明 |
|---|---|
| 监督记录 | 录入每次监督检查的详细信息 |
| 风险等级 | 设置高/中/低风险等级 |
| 问题追踪 | 记录发现问题、处理结果、后续跟进 |
| 预警机制 | 高风险问题自动预警，推送给船工主管 |
| 统计分析 | 按船舶、类别、时间段统计监督覆盖率 |
| 闭环管理 | 问题从发现到解决的全流程追踪 |

#### 5.5.4 API设计

```
POST   /api/risk-supervisions              // 创建监督记录
GET    /api/risk-supervisions              // 列表（支持多维度筛选）
GET    /api/risk-supervisions/:id          // 详情
PUT    /api/risk-supervisions/:id          // 更新（处理结果等）
POST   /api/risk-supervisions/:id/close    // 关闭问题
GET    /api/risk-supervisions/stats        // 统计分析
GET    /api/risk-supervisions/alerts       // 预警列表
```

#### 5.5.5 前端UI设计

**页面路径：** `/risk-supervision`

**页面布局：**
```
┌─────────────────────────────────────────────────┐
│  廉洁风险监督台账                                │
├─────────────────────────────────────────────────┤
│  筛选：船舶 | 类别 | 风险等级 | 状态 | 时间范围  │
├─────────────────────────────────────────────────┤
│  [新建监督记录]  [导出报表]  [查看统计]          │
├─────────────────────────────────────────────────┤
│  高风险预警 (2)                                  │
│  🔴 XX轮 - 伙食费超标 - 待处理                   │
│  🔴 XX轮 - 备件采购异常 - 处理中                 │
├─────────────────────────────────────────────────┤
│  监督记录列表                                    │
│  ┌─────────────────────────────────────────────┐│
│  │ 日期 | 船舶 | 类别 | 风险等级 | 状态 | 操作 ││
│  ├─────────────────────────────────────────────┤│
│  │ 06-08| XX轮| 伙食 | 🔴高    | 待处理│[处理]││
│  │ 06-07| XX轮| 经费 | 🟡中    | 已解决│[查看]││
│  │ 06-05| XX轮| 燃油 | 🟢低    | 已关闭│[查看]││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

### 5.5 数据分析看板

#### 5.5.1 功能描述

为船工主管提供数据驱动的决策支持，实现党建工作、政委履职、廉洁监督的可视化分析。

#### 5.5.2 看板模块设计

**模块1：党建工作统计**
- 各船舶党建活动频次柱状图
- 党建分类分布饼图
- 月度党建趋势折线图
- 标杆船舶创建进度

**模块2：政委履职分析**
- 政委日记数量排名
- 分类分布合理性评分
- 活跃天数趋势
- 帮扶计划完成率

**模块3：廉洁风险监督**
- 高风险领域覆盖率雷达图
- 监督问题处理率
- 风险等级分布
- 预警处理及时率

**模块4：船员服务**
- 船员诉求收集数量
- 诉求解决率
- 谈心谈话覆盖范围
- 船员满意度趋势

#### 5.5.3 API设计

```
GET    /api/dashboard/political-work    // 党建工作统计
GET    /api/dashboard/officer-profile   // 政委履职分析
GET    /api/dashboard/risk-supervision  // 廉洁监督统计
GET    /api/dashboard/crew-service      // 船员服务统计
GET    /api/dashboard/overview          // 综合概览
```

#### 5.5.4 前端UI设计

**页面路径：** `/dashboard`

**页面布局：**
```
┌─────────────────────────────────────────────────┐
│  船工主管工作看板                                │
├─────────────────────────────────────────────────┤
│  时间范围：[本月▼] [本季度▼] [自定义]            │
├──────────────────────┬──────────────────────────┤
│  📊 党建工作         │  👤 政委履职             │
│  [柱状图+饼图]       │  [排名+趋势图]           │
├──────────────────────┼──────────────────────────┤
│  🛡️ 廉洁监督         │  ❤️ 船员服务             │
│  [雷达图+处理率]     │  [解决率+覆盖范围]       │
└──────────────────────┴──────────────────────────┘
```

---

### 5.6 AI能力介入方案

#### 5.6.1 智能分类推荐

**技术路线：**
```
用户保存日记 → 提取日记内容 → NLP关键词提取 → 匹配分类体系
→ 推荐一级+二级分类 → 用户确认/修改 → 记录用户偏好 → 模型优化
```

**实现方案：**
1. 日记保存时，后端提取内容关键词
2. 调用AI接口分析内容，匹配分类体系
3. 返回推荐分类，前端展示供用户确认
4. 记录用户最终选择，用于优化推荐准确率

**数据模型增强：**
在 `diaries` 表添加 `aiRecommendedCategory` 字段（可选）。

#### 5.6.2 AI周报自动生成

**技术路线：**
```
选择日期范围 → 读取该时段日记+日程 → 按分类汇总
→ 构建Prompt → 调用AI生成周报 → 预览编辑 → 导出/报送
```

**Prompt模板：**
```
请生成一份船舶政工工作周报，格式规范、文风正式。

时间范围：{startDate} 至 {endDate}
负责船舶：{shipList}

工作统计：
- 党建活动：{partyCount}次
- 谈心谈话：{talkCount}次
- 廉洁监督：{riskCount}次
- 应急处理：{emergencyCount}次

重点工作分类汇总：
{categorySummary}

请以上述内容为基础，生成一份800-1000字的正式工作周报，包含：
1. 总体工作情况概述
2. 重点工作开展情况（按分类）
3. 存在问题与改进措施
4. 下周工作计划
```

#### 5.6.3 风险预警机制

**技术路线：**
```
日记/监督记录入库 → AI识别关键词 → 匹配风险规则
→ 触发预警 → 推送通知 → 生成处理任务 → 跟踪闭环
```

**风险关键词库：**
```json
{
  "伙食风险": ["超标", "浪费", "采购异常", "价格偏高"],
  "经费风险": ["超支", "违规报销", "账目不清"],
  "廉洁风险": ["红包", "礼品", "回扣", "不诚信"],
  "安全风险": ["隐患", "违规操作", "未整改", "事故"],
  "思想风险": ["情绪低落", "矛盾", "不满", "离职倾向"]
}
```

#### 5.6.4 AI履职评估辅助

**技术路线：**
```
读取政委全量日记 → 分析数量、质量、分类分布
→ 对比基准值 → 生成评分参考 → 人工审核确认
```

**评估维度：**
- 日记数量（权重30%）：日均篇数、连续天数
- 分类覆盖（权重25%）：党建工作、思想工作、安全管理等覆盖情况
- 内容质量（权重25%）：字数、关键词密度、具体案例
- 问题解决（权重20%）：发现问题数量、解决率

---

### 5.7 技术实现细节

#### 5.7.1 数据库变更

**新增表：**
1. `political_officer_profile` - 政委履职档案表
2. `risk_supervision` - 廉洁风险监督台账表

**修改表：**
1. `diaries` 表添加：
   - `categoryFirst` - 一级分类（已实现）
   - `categorySecond` - 二级分类（已实现）
   - `talkTarget` - 谈心对象（可选）
   - `crewConcern` - 船员关注点（可选）

#### 5.7.2 后端模块设计

**新增模块：**
```
src/
├── political-officer-profile/
│   ├── political-officer-profile.controller.ts
│   ├── political-officer-profile.service.ts
│   ├── political-officer-profile.module.ts
│   └── dto/
├── risk-supervision/
│   ├── risk-supervision.controller.ts
│   ├── risk-supervision.service.ts
│   ├── risk-supervision.module.ts
│   └── dto/
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.service.ts
│   ├── dashboard.module.ts
│   └── dto/
└── ai-assistant/
    ├── ai-assistant.controller.ts
    ├── ai-assistant.service.ts
    ├── ai-assistant.module.ts
    └── prompts/
```

#### 5.7.3 前端页面设计

**新增页面：**
- `/political-officer-profiles` - 政委履职档案管理
- `/risk-supervision` - 廉洁风险监督台账
- `/dashboard` - 数据分析看板

**修改页面：**
- `/diary` - 日记页面（已添加分类选择器）
- `/admin` - 系统管理（增强分类管理功能）

#### 5.7.4 分类数据初始化

**导入脚本：** `prisma/seed-categories.ts`

**导入内容：**
1. 一二级分类预设数据（9个一级，40+个二级）
2. 按船舶类型设置分类模板
3. 支持团队级分类自定义

---

### 5.8 实施路线图

#### Phase 1: 立即可用（1-2周）

**任务清单：**
- ✅ 已完成：日记系统添加一二级分类选择器
- ✅ 已完成：后端Diary模型添加categoryFirst/categorySecond字段
- 导入分类体系到字典管理（seed-categories.ts）
- 管理员后台分类管理功能完善
- 日记页面关联船舶信息

**验收标准：**
- 日记可正确选择一二级分类
- 分类数据正确导入数据库
- 管理员可查看/编辑分类

#### Phase 2: 短期优化（2-4周）

**任务清单：**
- 政委履职档案模块（前后端完整实现）
- 廉洁风险监督台账模块（前后端完整实现）
- 日记导出功能（Word/PDF）
- 按船舶+分类筛选查看

**验收标准：**
- 可创建、查看、编辑政委档案
- 可录入、追踪廉洁风险监督记录
- 日记可导出为规范格式

#### Phase 3: 中期建设（1-2个月）

**任务清单：**
- 数据分析看板（4个模块）
- AI智能分类推荐
- AI周报自动生成
- 风险预警机制

**验收标准：**
- 看板数据准确、可视化效果好
- AI分类推荐准确率>80%
- AI周报可直接使用
- 预警及时推送

---

### 5.9 测试与验收

#### 5.9.1 功能测试清单

| 测试项 | 测试内容 | 验收标准 |
|---|---|---|
| 分类选择 | 一二级分类联动选择 | 一级变化时二级正确过滤 |
| 数据继承 | 新日记继承前一天分类 | 分类自动填充正确 |
| 档案创建 | 政委派前谈话后创建档案 | 档案信息完整 |
| 监督记录 | 廉洁风险监督录入 | 字段完整、状态正确 |
| 数据看板 | 统计图表数据准确 | 与实际数据一致 |
| AI推荐 | 智能分类推荐 | 推荐准确率>80% |
| AI周报 | 周报生成质量 | 格式规范、内容完整 |

#### 5.9.2 性能测试

- 日记列表加载：≤1秒（1000条记录）
- 分类筛选响应：≤500ms
- 看板数据加载：≤2秒
- AI接口响应：≤5秒

---

### 5.10 权限与安全

#### 5.10.1 角色权限矩阵

| 功能模块 | 船工主管 | 船舶政委 | 其他角色 |
|---|---|---|---|
| 日记查看/编辑 | 全部 | 本人 | 无权限 |
| 分类管理 | 创建/编辑 | 使用 | 无权限 |
| 政委档案 | 查看/编辑全部 | 查看本人 | 无权限 |
| 风险监督 | 查看/编辑全部 | 录入本船 | 无权限 |
| 数据看板 | 全部可见 | 本船数据 | 无权限 |
| AI功能 | 全部可用 | 可用 | 无权限 |

#### 5.10.2 数据安全

- 所有新增模块遵循team_code隔离原则
- 操作日志全覆盖
- 敏感数据加密存储
- API权限校验

---

### 5.11 阶段五完成状态（已实现）✅

**完成日期：** 2026-06-09

#### 5.11.1 数据库层
- ✅ 新增 `PublishTemplate` 表（发布模板表）
- ✅ 新增 `ShipTaskStatus` 表（船舶任务状态表）
- ✅ 增强 `Ship` 表（添加动态信息字段、政委信息字段）
- ✅ 数据库已同步并生成Prisma客户端

#### 5.11.2 后端层
- ✅ 创建 `publish` 模块（Controller + Service + DTO）
- ✅ 实现11个API端点：
  - 模板管理：CRUD + 草稿/发布
  - 任务管理：列表/更新/触发
  - 动态状态看板：获取所有船舶状态
- ✅ 自动任务创建逻辑（发布时自动为匹配船舶创建任务）
- ✅ 进度自动计算（完成数/总数）
- ✅ 角色权限控制（JwtAuthGuard + RolesGuard）
- ✅ 已注册到 `app.module.ts`

#### 5.11.3 前端层
- ✅ 创建 `PublishManager.vue` 组件（船工主管模板管理）
- ✅ 创建 `FlipBoardView.vue` 组件（翻牌子船舶动态看板）
- ✅ 创建 `DiaryTaskPanel.vue` 组件（政委日记任务面板）
- ✅ 集成到 `diary.vue` 页面（政委任务面板）
- ✅ 集成到 `index.vue` 工作台页面（翻牌子看板 + 发布管理）
- ✅ 角色权限控制（船工主管/船舶政委视图区分）
- ✅ useApi添加 `publishTemplates` 和 `shipTasks` API方法
- ✅ TypeScript类型定义（index.ts）

#### 5.11.4 初始化数据
- ✅ 创建种子脚本 `seed-publish-templates.ts`
- ✅ 为3个团队创建默认模板：
  - 船舶动态报告模板（5个文本项）
  - 抵港前检查模板（10个检查项）
- ✅ 默认模板已发布并可用

#### 5.11.5 服务验证
- ✅ 后端服务运行正常（localhost:3002）
- ✅ 前端服务运行正常（localhost:3000）
- ✅ 所有API端点已注册并可用
- ✅ 编译无错误

---

## 附录**文档结束**

# 熊猫笔记 - 项目开发规则

> ⚠️⚠️⚠️ **【每次优化前必读】请先打开 /workspace/panda-note/001优化前提文件.md 从头完整读一遍，所有强约束、工作流、自检清单都在那个文档里。本文档是精简版本，详细规则以001优化前提文件.md 为准。下次一定要看001优化前提文件！永远都要看！**

## 数据库操作红线（最高优先级）

### 禁止操作
- **严禁**在任何情况下使用 `prisma db push --force-reset`
- **严禁**执行 `DROP TABLE`、`DROP DATABASE`、`TRUNCATE` 等清空数据的 SQL 命令
- **严禁**使用 `prisma migrate reset` 或 `prisma migrate dev` 对生产数据库执行重置操作

### 原因
`--force-reset` 会直接清空整个数据库并重建 schema，导致所有用户数据、船舶数据、业务数据全部丢失。生产环境不允许任何形式的数据丢失。

### 事故记录
- **2026-06-21**：在角色菜单权限配置功能开发中，误执行 `prisma db push --force-reset`，导致远程数据库（106.14.57.62:5432）全部清空。服务器重启后通过 `createInitialUsers()` 恢复用户，但船舶数据、日记、日程等业务数据永久丢失。

### 正确的数据库变更方式
1. **新增表/字段**：使用 `prisma db push`（不带 `--force-reset`），仅同步 schema 差异
2. **生产环境迁移**：使用 `prisma migrate deploy`（仅应用已有的迁移文件）
3. **开发环境迁移**：使用 `prisma migrate dev --name xxx` 生成迁移文件，然后 `prisma migrate deploy` 应用到生产
4. **需要修改表结构**：先备份数据，再执行变更，最后恢复数据

---

## 0. 优化标准工作流（零号规则，每次优化按这个顺序走）
> 详细流程、打勾清单见 /workspace/panda-note/001优化前提文件.md

1. **先读文档**：打开 /workspace/panda-note/001优化前提文件.md 从头读到尾
2. **称呼 + 确认**：对用户说"陈先生"，并确认已阅读该文档
3. **业务链梳理**：全项目 Grep 所有相关关键词，列出入口→页面→组件→store→API→后端→DB 完整链路，所有角色所有端都覆盖
4. **形成方案并 TodoWrite**：写清楚改哪些文件、为什么改、有什么风险
5. **最小化修改**：优先 Edit，避免 Write 覆盖
6. **自检清单**：语法/类型/残留漏改/需求对照/git diff review 全部过一遍
7. **提交部署**：add → commit（为什么改）→ 打 TAG（X.Y.Z.MMDD）→ push main + push TAG（自动使用已持久化凭据，绝不再让陈先生提供 Token）
8. **汇报**：称呼"陈先生"，说明修改内容、部署状态、陈先生需要做的事（例如 Ctrl+F5）

---

## 1. 凭据与配置持久化（陈先生是编程小白，任何配置只允许要一次！）
- 陈先生给过的任何凭据、Token、密钥、SSH Key、服务器账号，**必须立即持久化保存**，以后自动使用，绝不允许反复索要
- **GitHub PAT**：保存位置 `/root/.git-credentials`（chmod 600），用 `git config --global credential.helper store`；需要时直接 `git push`，不准再问
- **忘记凭据处理流程**：先自查 .git-credentials、~/.ssh/、.env、gh config、环境变量；全部找不到且确实是第一次才可以问陈先生
- 凭据失效更新：主动说明"上次的 Token 失效了，需要更新一次"，更新后立即再次持久化

---

## 2. 绝不盲目修改
- 修改前必须先梳理完整业务链，定位根因，再动手；禁止"头痛医头，脚痛医脚"
- 任何改名/改逻辑都要做全项目搜索（Grep），确保 UI、菜单、底部导航、工作台卡片、导出/导入、搜索、Dialog 标题、路由 title 等**零残留漏改**
- 要覆盖所有角色（船舶/岸基/总管/admin）和所有端（PC/平板/手机/Electron 船舶端）

---

## 3. 每次修改后必须自检
- 语法/类型/模板闭合/组件引入检查
- 全项目再搜一遍旧关键词，确认零残留
- 改动点 vs 原始需求逐条对照打勾
- git diff 逐行 review，没改到不该改的
- commit message 写"**为什么改**"，不是"改了什么"

---

## 部署流程规则

### 部署前检查
- [ ] 确认数据库连接正常（`DATABASE_URL` 正确）
- [ ] 确认 `.env` 文件中 `JWT_SECRET` 已配置
- [ ] 前端构建产物已生成（`dist/` 目录）
- [ ] 后端编译通过（`npx tsc --noEmit` 无错误）

### 部署步骤（标准流程）
1. 本地构建前端：`npx nuxi build`
2. 本地编译后端：`npx tsc`
3. 打包产物上传到服务器
4. 服务器端：`npm install --production`
5. 服务器端：`npx prisma db push`（仅同步 schema，不重置数据）
6. 服务器端：`npx prisma generate`
7. 重启后端服务：`pm2 restart nav-log-backend`
8. 验证服务健康：`curl http://localhost:3002/api/health`

### 标准 Git 提交流程（任何代码修改都必须走）
```bash
cd /workspace/panda-note
git status && git diff                         # 1. 看改了什么
git add -A                                     # 2. 全部加入
git commit -m "xxx: 说明为什么改"              # 3. 提交（写原因！）
git tag -a X.Y.Z.MMDD -m "Release X.Y.Z.MMDD: xxx"  # 4. 打 TAG
git push origin main                           # 5. 推分支（自动用凭据）
git push origin X.Y.Z.MMDD                     # 6. 推 TAG（自动用凭据）
```

### 部署后验证
- [ ] 登录功能正常（gogotb/123456）
- [ ] 各角色页面正常显示
- [ ] API 接口返回正常
- [ ] 版本号显示正确

---

## 代码规范

### 后端
- 所有 API 接口必须包含输入验证（`class-validator` / `ParseIntPipe` 等）
- 异常处理使用 NestJS 标准异常类（`NotFoundException`、`BadRequestException`），不要使用 `throw new Error()`
- Prisma 查询必须确保参数非空/非 NaN，避免 `PrismaClientValidationError`

### 前端
- 菜单/导航配置从后端 API 动态获取，不硬编码角色判断
- 权限控制通过 `@Roles` 装饰器在后端守卫实现，前端仅做 UI 隐藏
- 所有 API 调用通过 `useApi()` composable 统一管理

---

## 服务器信息
- **IP**: 106.14.57.62
- **后端端口**: 3002
- **前端端口**: 3000
- **数据库**: PostgreSQL 5432
- **进程管理**: PM2
- **部署路径**: /www/wwwroot/nav-log-system

## 默认用户
| 用户名 | 密码 | 角色 |
|--------|------|------|
| gogotb | 123456 | admin |
| shore_crew | admin123 | shore_crew_supervisor |
| supervisor | 123456 | ship_political_instructor |
| ship_political | admin123 | ship_political_instructor |

> ⚠️ **最后提醒：下次优化前一定要先读 /workspace/panda-note/001优化前提文件.md！每一次都要读！记忆一直传承下去！**
# 熊猫笔记 - 项目开发规则

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
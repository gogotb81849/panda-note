# 这是熊猫笔记部署脚本的便车目录（自动化用）

## 为什么放在 prisma/_deploy-assets 里？
.github/workflows/deploy.yml 的 Package artifacts step 里写死了：
```bash
  cp -r backend/prisma/* dist-artifacts/prisma/
  cp -rf /tmp/dist-artifacts/prisma/* "$DEPLOY_DIR/backend/prisma/"
```
并且修改 deploy.yml 需要 GitHub PAT 具备 workflow scope 才能 push（当前 PAT 只有 repo），
因此借用 prisma 目录作为"附带文件搭便车上传"的机制。

## prisma 本身会不会受影响？
不会。prisma generate 只读取 schema.prisma 文件；db push 也只看 schema.prisma 和 migrations/。
新增的本目录不会被 prisma 命令读取，也不会破坏 prisma 功能。

## 本目录内容：
- `server-side-extra.sh`：SCP 到服务器后，被 backend/package.json 的 postinstall 钩子（scripts/postinstall.js）调用。
   作用：① 熊猫笔记 PM2 自修复；② 联动更新海上菜篮子（sync-update-from-panda.sh）。
   脚本有大量 if 门槛检查（root/非GITHUB_ACTIONS/DEPLOY_DIR），不是服务器部署环境就安全退出。

⚠️ 如果以后您确实给 PAT 加了 workflow scope，建议把这部分"搭便车"机制迁移为修改 deploy.yml，
   直接在 Package artifacts 步骤里单独 cp scripts/ → dist-artifacts/scripts/ 更清爽。

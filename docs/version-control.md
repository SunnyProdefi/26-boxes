# Git 与 GitHub 版本管理说明

## 1. 当前仓库状态

- 本地仓库已初始化。
- 默认分支为 `main`。
- 首版提交信息：`feat: build 26 boxes web game`。
- 提交内容包含网页游戏、规则引擎、测试、游戏策划文档和软件架构文档。

## 2. 分支策略

推荐使用简洁的主干开发流程：

- `main`：稳定可运行版本。
- `feature/<name>`：新功能分支，例如 `feature/sound-effects`。
- `fix/<name>`：缺陷修复分支，例如 `fix/final-offer-state`。
- `docs/<name>`：文档更新分支，例如 `docs/rules-update`。

合并到 `main` 前至少完成：

```bash
npm test
```

## 3. 提交规范

建议使用 Conventional Commits：

- `feat:` 新功能。
- `fix:` 缺陷修复。
- `docs:` 文档更新。
- `test:` 测试更新。
- `style:` 样式调整。
- `refactor:` 重构。
- `chore:` 工程配置。

示例：

```bash
git commit -m "feat: add banker call animation"
git commit -m "fix: prevent opening selected player box"
git commit -m "docs: update game design rules"
```

## 4. GitHub 远端配置

若已经在 GitHub 创建了仓库，建议仓库名为 `26-boxes`。在本地执行：

```bash
git remote add origin https://github.com/<owner>/26-boxes.git
git push -u origin main
```

如果使用 SSH：

```bash
git remote add origin git@github.com:<owner>/26-boxes.git
git push -u origin main
```

## 5. Pull Request 流程

1. 从 `main` 拉出功能分支。
2. 完成开发并运行测试。
3. 推送分支到 GitHub。
4. 创建 Pull Request。
5. 检查差异、测试结果和文档影响。
6. 合并后删除功能分支。

示例：

```bash
git switch -c feature/statistics
npm test
git add .
git commit -m "feat: add game statistics"
git push -u origin feature/statistics
```

## 6. 发布版本

可用 Git tag 标记可试玩版本：

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub Release 建议包含：

- 版本亮点。
- 可游玩地址或下载说明。
- 已知问题。
- 测试结果。

## 7. 当前环境限制记录

本次交付时，本地环境没有安装 GitHub CLI `gh`，GitHub 连接器也未能完成握手，因此已完成本地 Git 初始化与提交，但未能自动创建 GitHub 远端或推送。补齐远端仓库后，执行第 4 节命令即可完成 GitHub 托管。

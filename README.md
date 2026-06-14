# 26 Boxes

一个基于“26 个金额箱子”规则的网页版 Deal / No Deal 风格游戏。玩家先保留一个箱子，再按 6、5、4、3、2、1... 的节奏打开其他箱子，面对银行家报价并做出 Deal 或 No Deal 的选择，最终可以保留或交换最后一个箱子。

## 快速开始

```bash
npm test
npm start
```

启动后访问终端输出的本地地址，默认是 `http://localhost:4173`。

也可以直接用浏览器打开 `index.html` 游玩。

## 项目结构

```text
.
├── docs/
│   ├── game-design.md
│   └── software-architecture.md
├── scripts/
│   └── static-server.mjs
├── src/
│   ├── app.js
│   └── game-engine.js
├── tests/
│   └── game-engine.test.mjs
├── index.html
├── styles.css
└── package.json
```

## 版本管理

- `main`：稳定版本分支。
- 建议功能开发使用 `feature/<name>` 分支，完成后合并回 `main`。
- 本仓库已包含可运行测试，提交前建议执行 `npm test`。

## 文档

- 游戏策划文档：[docs/game-design.md](docs/game-design.md)
- 软件架构设计说明：[docs/software-architecture.md](docs/software-architecture.md)
- Git 与 GitHub 版本管理：[docs/version-control.md](docs/version-control.md)

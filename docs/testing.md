# 测试

原则：**能写成自动测试的行为，就写成测试；文档不替测试做判断。**

## 自动化

```bash
npm test
```

- `test/protocol.test.js`：端点根、令牌头、路径越界
- `test/dsh-import.test.js`：DSH 日志解析、导入暂存与 `importId` ACK 匹配、确认不接受越出暂存目录的 id
- `test/webview-route.test.js`：`/webchat` 路由层——来源校验（含旧宿主回退）、凭据选择、静态托管、导入确认的端到端回归
- `test/frontend-compat.test.js`：扫描已打补丁的 vendor 源码和 `webview/dist`，禁止旧内核不支持的 ES2023 数组方法；CI 也执行这一项
- `test/client-menu.test.js`：新旧宿主的导入菜单、菜单服务晚启动与卸载、导入失败后的重试

路由层用假的 `req`/`res` 驱动 `createWebview` 返回的处理器，不需要起 HTTP 服务。**新增安全相关守卫时，先确认测试能在这个守卫被删掉时失败**——只覆盖"正常路径能过"的测试挡不住回归。

新增可自动化的逻辑时，优先补对应 `test/*.test.js`，不要先在文档里写一套“让 Agent 自己看”的验收标准。

## 系统自检

- `GET /webchat/api/self-test`：入口页、静态资源、一次真实生成
- `npm pack --dry-run`：确认入口文件和 `webview/dist` 都在包内

`self-test` 里的 `messages` 一项会**真实调用一次生成接口**，产生实际计费。它不是免费的连通性探测，不要放进定时任务或高频轮询。

## 人工 gate

只有自动化覆盖不了的场景才留给人工：

- 真实 DSH 桌面/Go 宿主里的视觉效果和交互
- DSH 桌面兼容：在 `0.1.7-alpha.1`、`0.2.0-rc.2`、`0.2.1-rc.4` 和 `0.2.2-rc.5` 检查安装、登录后发消息和会话导入；新版检查菜单、键盘与通知
- macOS 窗口红绿灯：侧栏收起时打开插件，红绿灯不压住网页版 logo；全屏不额外留白；Windows 外观不回归
- 真实 DeepSeek 服务的端到端对话
- 浏览器原生能力（截图粘贴、页面缩放等）
- 旧内核 ZIP 导入：Chromium 109，或初始化时删除 `Array.prototype.toSorted` / `toReversed`，
  用合规 v3 ZIP 走设置页导入；覆盖读取中关闭设置再打开、格式/版本错误、`NotReadableError`、
  `QuotaExceededError` 和未知错误
- 最终包安装后的发布前 smoke

发布前由维护者/用户本地安装最终包确认核心流程，具体发布门槛见 [release.md](release.md)。

## 维护规则

- 可自动化的行为：写测试。
- 测试命令、测试分层、无法自动化的缺口：写本文件。
- 不要把逐条功能验收步骤搬进 `AGENTS.md` 或本文件；那样只会让文档和真实测试脱节。

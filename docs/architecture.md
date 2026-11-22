# 架构与工程链路

## 组件

| 层 | 文件 | 职责 |
|---|---|---|
| 宿主入口 | `index.js` | 注册 `/webchat` 前缀路由（必须用 `handler`，`resource` 只接 GET/HEAD） |
| 宿主路由 | `src/webview.js` | 静态产物、自检、导入接口、Messages/Files 转发、TTS/ASR 转发 |
| 协议约定 | `src/protocol.js` | 端点根、令牌头、路径越界判断；纯函数，有测试 |
| 导入解析 | `src/dsh-import.js` | 只读解析 DSH 会话日志 → chat-demo 会话；暂存与确认；有测试 |
| 界面壳 | `client.js` | 左侧面板槽位、iframe、会话右键菜单、麦克风/头像桥 |
| 前端产物 | `webview/dist` | chat-demo v0.1.3 构建产物，随仓库分发 |
| 上游补丁 | `webview/patches/0001-dsh-integration.patch` | 对 chat-demo 的全部改动 |

上游基准：`8ad7b56e196b87d8a3215dc09476d6d146ad3f0e`（chat-demo v0.1.3，MIT）。

## 请求链路

1. 浏览器只访问同源宿主 `/webchat/*`，不持有 DeepSeek 凭据。
2. 宿主把 `/webchat/anthropic/v1/messages` 转发到官方 Messages：
   - 优先 DSH 账户令牌（`x-dsh-auth-token`）
   - 没有账户令牌时用 DSH 模型设置里的 API Key（`x-api-key`）
   - 凭据名只在 **DeepSeek 自己的提供方**里找（`ns` 以 `deepseek` 开头，或 `baseURL` 指向 `deepseek.com`）；装了多个模型提供方时不能按 `apiKeyEnv` 字段名模糊匹配，否则会取到别家的 Key
3. 附件走 `/webchat/anthropic/v1/files`：
   - 只有官方端点（hostname `api.deepseek.com`）改走 Files API 根路径 `/files`
   - 自定义兼容网关保留原 `/anthropic/v1/files`
   - 图片表单带 `purpose=user_data`，但仍先做客户端预缩放
   - 100MB 级上传必须流式转发，不能整包读内存
   - `readBody` 的 64MiB 上限只管整包读的请求（JSON / TTS / ASR），**不管**附件流式转发
4. TTS/ASR 都经宿主 `/webchat/v1/tools/*` 转发，浏览器不接触凭据。

## 来源校验

插件路由不在 DSH 的 `/api` 信任栅栏内，由 `untrustedRejection` 自己挡：有 `connection` 服务时用它的 `requestRejection`（Host/Origin 栅栏 + 浏览器 Cookie）；旧宿主没有该服务时退回检查 `Sec-Fetch-Site: cross-site`。`dsh-app:` 桌面窗口放行。

`connection` 不能升成必需注入——`engines.dsh` 覆盖到 `0.1.7-alpha.1`，缺该服务的老宿主上插件会整个不挂载。因此这一层是「两侧都挡，没有无条件放行」，而不是「缺席即拒绝」。

静态产物里带内容哈希的资源返回 `immutable` 长缓存；入口页与 `LICENSE` 不缓存，保证能拿到最新资源名。

## 长文档链路

- 官方 API 的扩展模式（请求里带 `safety_check`、`tools`、`title` 任一）限制输入 32k tokens。
- 前端命中 400 `user input too long ... max 32768` 时：
  1. 去掉扩展字段，用普通模式带完整附件/历史重发；
  2. 回答完成后单独发一个小标题请求（提问 + 文件名 + 粘贴原文截断 + 主回复摘要）。
- 普通短消息仍走扩展模式，不主动降级。
- 服务端仍有 20 文档引用、8MiB 文档文字、1M 上下文硬限制；前端不能绕过。

## 存储与导入

- 左侧面板由 `slots` 和 `layout` 注册。会话导入优先接入 `contextMenus`；旧宿主在 `sidebar.workspaces.session.menu.item` 渲染宿主自带的菜单按钮。两个入口共用同一次暂存请求，菜单服务就绪或卸载时切换注册。
- 主数据库：chat-demo IndexedDB，**保持 v11**，不要无必要升级。
- 导入回执：独立数据库 `chat-demo-import-receipts`，避免主库升级阻塞多个面板。
- 导入操作：
  - 每次主动导入一个 `importId`；
  - 回执先 pending，会话保存成功后 done；
  - ACK 按 `importId` 精确匹配，旧/无标识确认不能删新暂存；
  - 已有本地会话时只做前缀更新/追加，本地续聊、分支、标题、置顶优先保留；
  - ZIP 导出/回导保留消息原始 ID，以便之后继续从 DSH 导入。
- 保存失败：
  - 连接失效先重开连接并补存一次；
  - 手动「重试」先丢弃失效句柄；
  - 未打开会话改名失败进入待重试队列。
- ZIP 导入/导出/清空与待导入共用 Web Locks，防止多个同源面板同时提交暂存。

## 旧内核与导入状态

- DSH Go / Android WebView 可能停留在 Chromium 110 之前。前端源码不得使用 ES2023 的
  `Array.prototype.toSorted` / `toReversed`，改用 `slice().sort()` / `slice().reverse()`。
- 设置页的导入 hook 挂在 `SettingsDialog`，关闭设置不会卸载导入任务；读取中显示「正在导入历史对话…」，
  结果在重新打开设置后仍可见，避免用户以为点了没反应而重复操作。
- 导入错误按原因区分：归档格式/版本错误用 `BackupError.key`；`QuotaExceededError` 提示存储空间不足；
  `NotReadableError` 提示重新选择 ZIP；未知错误用中性重试提示。不要把具体对话内容写进错误。

## 桌面壳与旧版 DSH

- `engines.dsh` / 可选 peer 最低兼容 `0.1.7-alpha.1`；不能只靠降低版本号，插件必须在新旧宿主都能挂载。
- 新版宿主用 `contextMenus` 注册会话导入；旧版没有该服务时，用宿主自带的
  `sidebar.workspaces.session.menu.item` 渲染同一条导入按钮。两个入口共用一次暂存请求，
  `contextMenus` 迟到或卸载时切换注册，不会同时出现两份。
- macOS 红绿灯悬浮在窗口内容上方。DSH 只在部分入口页预留
  `--dsh-frame-top-clearance`；插件作为 global main panel，在面板贴住窗口左边且非全屏时，
  用该高度减去 DSH main panel 已有的 padding，避免红绿灯压住网页版侧栏。

## 前端构建

上游前端不能用“直接改 vendor”作为交付方式。流程固定：

```bash
cd webview/vendor/chat-demo
git add -A
git diff --cached --binary --output=../../patches/0001-dsh-integration.patch
git reset

cd ../../..
pwsh scripts/build-webview.ps1
```

`scripts/build-webview.ps1` 会 fetch 上游、`git reset --hard`、`git clean -fd` 再应用补丁，最后构建并同步 `webview/dist`。只改 `webview/dist` 或 `client.js` 时通常刷新页面即可；宿主 `index.js` / `src/*` 改动需要重新安装插件。

## 测试

- 宿主纯函数：`node --test test/protocol.test.js test/dsh-import.test.js`
- 系统自检与人工 gate：见 [testing.md](testing.md)
- 发布门槛与版本策略：见 [release.md](release.md)

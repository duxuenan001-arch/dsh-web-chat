# 版本与发布

## 版本策略

- **patch**：修 bug、兼容性修复、文案修正
- **minor**：用户能感知的新能力，向后兼容
- **major**：不兼容的协议/配置变更；当前只会在 DSH 版本范围变化时考虑
- 发布前先在本地安装最终包验证，不直接推未经验证的 main

## 发布前门槛

- [ ] 工作区干净，`git status` 无未提交改动
- [ ] 相关测试通过：`node --test test/protocol.test.js test/dsh-import.test.js`
- [ ] 前端需要重建时，从上游干净 reset 后应用补丁重建，并提交 `webview/dist`
- [ ] `npm pack --dry-run` 核对包名、版本、入口、`webview/dist`、文件数
- [ ] 本地安装最终包，按 [testing.md](testing.md) 做核心 smoke（能自动化的先跑测试）
- [ ] 涉及用户反馈的修复，尽量等报告者确认后再关闭 issue
- [ ] 用户明确同意发布后，才 push / publish / tag

## 发布步骤

```bash
# 1. 提交并推送 main
git push origin main

# 2. npm 发布（固定使用 npmjs）
npm publish --registry=https://registry.npmjs.org/ --access public

# 3. 打 tag
git tag -a vX.Y.Z -m 'dsh-chat-web X.Y.Z'
git push origin vX.Y.Z

# 4. GitHub Release
gh release create vX.Y.Z --title 'dsh-chat-web X.Y.Z' --notes-file <release-notes.md>
```

发布后核对：

- npm 包版本可查
- GitHub tag 与 Release 指向同一提交
- Release notes 是用户可读的，不写内部实现细节

## 发布说明写法

- 面向用户讲“现在能做什么/更稳了”，不讲补丁、内部字段、测试命令
- 不承诺服务端做不到的事（例如“每页数字都保证准确”）
- 不把浏览器级能力写成产品新功能；必要时写“支持浏览器式快捷键”
- 已知限制只写用户会遇到的，不写维护者内部备注

## 回滚

- npm 不 unpublish 已发布版本；有问题用 `npm deprecate` 并尽快发 patch
- 已推送的 tag 不移除、不强制改名
- 发布后问题记录到 issue，修复走下一个 patch

# Prompt Atelier

一个专为 AI 出图设计师制作的本地 Prompt 管理与快捷取词浏览器扩展。它能管理提示词、工具参数、参考图和品牌风格，并在任意网页输入框中快速插入最终 Prompt。全部数据只保存在浏览器本机，不需要后端、账号或第三方服务。

## 功能

- 管理 Midjourney、Stable Diffusion、Nano Banana·Gemini、即梦·可灵及其他工具的 Prompt。
- 保存标签、参考图、结果图、收藏、备注和各工具专属参数。
- 用风格块和品牌预设合成一致的最终 Prompt。
- 用浏览器快捷键或在输入框输入 `/p` 打开取词器。
- 支持普通输入框、文本框和网页富文本输入区；非标准节点自动复制到剪贴板。
- JSON 全量导出与合并导入，文件带版本号。

## 技术架构

项目使用原生 HTML、CSS 和 JavaScript，遵循 Manifest V3。管理页与网页取词器共用数据、筛选和合成逻辑；数据保存在 `chrome.storage.local`。取词器使用 Shadow DOM 隔离样式，不会修改宿主网页样式。无构建步骤、无运行时依赖。

## 本地运行

1. 打开 Chrome 的 `chrome://extensions` 或 Edge 的 `edge://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目根目录，即包含 `manifest.json` 的目录。
5. 点击扩展图标进入管理页。

默认快捷键：Windows/Linux 为 `Ctrl+Shift+P`，macOS 为 `Command+Shift+P`。可在浏览器扩展快捷键页面修改。

## 部署

v1 不需要服务器。发布前将项目根目录中的扩展运行文件打包为 ZIP，再上传 Chrome 应用商店后台。测试文件和项目文档可在正式打包时排除。

## 测试

```bash
npm test
npm run check
```

网页插入测试页位于 `tests/fixtures/input-harness.html`，需要通过 `http://` 地址打开，确保 content script 会注入。

## 修改署名

只编辑 `config.js` 顶部的 `PROMPT_ATELIER_CONFIG` 对象，即可修改产品名、制作人和引流链接。

## 搜索记录

2026-06-27 已检索 skills.sh、GitHub 与 Chrome 官方文档：

- [skills.sh 的 Chrome Extension Development](https://skills.sh/mindrally/skills/chrome-extension-development)：确认原生 Manifest V3、最小权限和内容脚本隔离是合适方向；本项目不引入该外部技能依赖。
- [GoogleChrome modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/skills-src/chrome-extensions/SKILL.md)：参考其 Manifest V3 最佳实践入口，项目保持无远程代码、无内联执行逻辑。
- [Chrome commands 官方文档](https://developer.chrome.com/docs/extensions/reference/api/commands)：快捷键使用 `chrome.commands` 声明并由 service worker 转发。
- [Chrome storage 官方文档](https://developer.chrome.com/docs/extensions/reference/api/storage)：图片使用 `storage.local` 配合 `unlimitedStorage`。
- [Chrome content scripts 官方文档](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)：取词器静态注入到 http/https 页面，并使用 Shadow DOM 隔离界面。

## 已完成与待办

v1 需求已全部实现。当前没有超出 v1 范围的待办。

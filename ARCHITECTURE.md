# 架构说明

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `manifest.json` | 声明 Manifest V3、权限、管理页、快捷键、后台脚本和网页脚本。 |
| `config.js` | 集中保存产品名、署名和引流链接。 |
| `assets/` | 保存扩展品牌图标及可编辑 SVG 源文件。 |
| `shared/core.js` | 负责数据结构、工具参数拼接、Prompt 合成、筛选、导入校验和合并。 |
| `shared/storage.js` | 统一读写 `chrome.storage.local`。 |
| `service-worker.js` | 初始化数据、打开管理页并把快捷键命令发送到当前网页。 |
| `options.html` | 管理页结构和编辑对话框。 |
| `options.css` | 管理页深色视觉与响应式布局。 |
| `options.js` | 管理 Prompt、风格块、合成器、图片、筛选和导入导出。 |
| `content.js` | 在网页注入 Shadow DOM 取词器，处理 `/p`、键盘操作、插入和剪贴板回退。 |
| `tests/` | 单元、Manifest、真实扩展端到端测试与网页输入验收页。 |

## 调用关系

```text
manifest.json
├─ service-worker.js ──快捷键消息──> content.js
├─ options.html ──> options.js
└─ content script ──> content.js

options.js ─┬─> shared/core.js
            └─> shared/storage.js ──> chrome.storage.local

content.js ─┬─> shared/core.js
            └─> shared/storage.js ──> chrome.storage.local
```

## 关键决定

- 使用原生技术，不增加框架和构建链；扩展目录可以直接加载，运行面更小。
- 管理页和取词器共享同一套纯函数，保证筛选、拼接和导入规则一致。
- 导入文件必须是版本 1 且结构正确；错误立即报出，不猜测或修补数据。
- 网页浮层使用 Shadow DOM，避免与宿主页面样式互相污染。
- 标准输入控件优先直接插入；非标准节点按产品要求复制到剪贴板并明确提示。

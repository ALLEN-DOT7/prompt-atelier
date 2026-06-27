# 发现

- 静态 content script 已覆盖所有 http/https 页面，不需要运行时动态注入权限。
- `activeTab` 配合快捷键命令和当前页消息足够使用，未增加可读取浏览记录的 `tabs` 权限。
- 图片存为 base64，必须保留 `unlimitedStorage`。
- 富文本输入区需要在浮层打开前保存光标 Range，否则焦点切到搜索框后无法恢复插入位置。
- 正式版 Chrome 会忽略命令行加载未打包扩展；自动验收改用隔离的 Chrome for Testing，不操作日常 Chrome。
- JSON 下载地址需要延后撤销，否则部分浏览器可能还未开始下载就失去 Blob。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

test("扩展使用 Manifest V3 且权限符合需求", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(new Set(manifest.permissions), new Set(["storage", "unlimitedStorage", "activeTab", "clipboardWrite"]));
});

test("管理页、快捷键和全站 content script 均已声明", () => {
  assert.equal(manifest.options_page, "options.html");
  assert.ok(manifest.commands["open-prompt-picker"]);
  assert.deepEqual(manifest.content_scripts[0].matches, ["http://*/*", "https://*/*"]);
  assert.ok(manifest.content_scripts[0].js.includes("content.js"));
});

test("品牌图标文件完整", () => {
  for (const icon of Object.values(manifest.icons)) {
    assert.equal(fs.existsSync(path.join(root, icon)), true, `缺少图标：${icon}`);
  }
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = `/tmp/prompt-atelier-playwright-${Date.now()}`;
const exportPath = `/tmp/prompt-atelier-export-${Date.now()}.json`;

const seed = {
  version: 1,
  prompts: [{
    id: "prompt_e2e",
    title: "电影感香水主视觉",
    body: "一只透明玻璃香水瓶，置于黑色火山岩上",
    tool: "Midjourney",
    params: { versionType: "--v", version: "6.1", aspectRatio: "16:9", styleReference: "123456789" },
    otherParams: "",
    tags: ["产品", "电影感"],
    styleBlockIds: ["style_e2e"],
    referenceImages: [],
    resultImage: "",
    favorite: true,
    notes: "",
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z"
  }],
  styleBlocks: [{
    id: "style_e2e",
    name: "品牌蓝调",
    content: "深蓝与银灰配色，冷冽轮廓光",
    isBrandPreset: true,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z"
  }]
};

const errors = [];
const checks = [];
const pass = (name) => checks.push(name);

const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  executablePath: chromium.executablePath(),
  args: [
    `--disable-extensions-except=${root}`,
    `--load-extension=${root}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1100,760",
    "--window-position=-1800,40"
  ],
  viewport: { width: 1100, height: 760 }
});

try {
  let worker = context.serviceWorkers().find((item) => item.url().endsWith("/service-worker.js"));
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 10000 });
  const extensionId = new URL(worker.url()).host;
  assert.match(extensionId, /^[a-p]{32}$/);
  pass("Manifest V3 扩展真实加载");

  const commands = await worker.evaluate(() => chrome.commands.getAll());
  const pickerCommand = commands.find((command) => command.name === "open-prompt-picker");
  assert.ok(pickerCommand);
  assert.ok(pickerCommand.shortcut);
  pass("自定义快捷键已注册");

  const optionsPage = await context.newPage();
  optionsPage.on("pageerror", (error) => errors.push(error.message));
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
  await optionsPage.evaluate((value) => chrome.storage.local.set({ promptAtelierData: value }), seed);
  await optionsPage.reload();
  await optionsPage.locator("#prompt-count").filter({ hasText: "1" }).waitFor();
  const stored = await optionsPage.evaluate(() => chrome.storage.local.get("promptAtelierData").then((result) => result.promptAtelierData));
  assert.deepEqual(stored, seed);
  pass("chrome.storage.local 刷新持久化");

  await optionsPage.locator("#primary-add-button").click();
  await optionsPage.locator("#prompt-tool").selectOption("Stable Diffusion 系");
  await optionsPage.locator('[data-param="checkpoint"]').waitFor();
  assert.equal(await optionsPage.locator('[data-param="aspectRatio"]').count(), 0);
  await optionsPage.locator("#add-lora").click();
  assert.equal(await optionsPage.locator(".lora-row").count(), 2);
  await optionsPage.locator("#prompt-tool").selectOption("Nano Banana·Gemini");
  await optionsPage.locator('[data-param="baseInstruction"]').waitFor();
  assert.equal(await optionsPage.locator('[data-param="editInstruction"]').count(), 1);
  await optionsPage.locator("#prompt-tool").selectOption("即梦·可灵");
  await optionsPage.locator('[data-param="style"]').waitFor();
  assert.equal(await optionsPage.locator('[data-param="reference"]').count(), 1);
  await optionsPage.locator("#prompt-tool").selectOption("其他");
  assert.equal(await optionsPage.locator("#dynamic-params [data-param]").count(), 0);
  assert.equal(await optionsPage.locator("#prompt-other-params").count(), 1);
  await optionsPage.locator("#prompt-tool").selectOption("Midjourney");
  await optionsPage.locator('[data-param="styleReference"]').waitFor();
  await optionsPage.locator('[data-close-dialog="prompt-dialog"]').last().click();
  pass("工具参数动态切换");

  await optionsPage.locator('[data-view-target="composer"]').click();
  await optionsPage.locator("#composer-base").selectOption("prompt_e2e");
  await optionsPage.locator('#composer-styles input[value="style_e2e"]').check();
  const composed = await optionsPage.locator("#composer-output").inputValue();
  assert.ok(composed.indexOf("深蓝与银灰") < composed.indexOf("透明玻璃香水瓶"));
  assert.match(composed, /--ar 16:9/);
  assert.match(composed, /--sref 123456789/);
  await optionsPage.locator("#copy-composed-button").click();
  await optionsPage.locator("#toast").filter({ hasText: "最终 Prompt 已复制" }).waitFor();
  pass("品牌风格合成与复制");

  await optionsPage.locator('[data-view-target="prompts"]').click();
  await optionsPage.locator("#search-input").fill("不存在");
  assert.equal(await optionsPage.locator('.prompt-card[data-id="prompt_e2e"]').count(), 0);
  await optionsPage.locator("#search-input").fill("香水");
  await optionsPage.locator("#tag-filter").selectOption("产品");
  await optionsPage.locator("#tool-filter").selectOption("Midjourney");
  await optionsPage.locator("#style-filter").selectOption("style_e2e");
  await optionsPage.locator("#favorite-filter").check();
  assert.equal(await optionsPage.locator('.prompt-card[data-id="prompt_e2e"]').count(), 1);
  await optionsPage.locator("#tool-filter").selectOption("其他");
  assert.equal(await optionsPage.locator('.prompt-card[data-id="prompt_e2e"]').count(), 0);
  await optionsPage.locator("#tool-filter").selectOption("");
  await optionsPage.locator("#style-filter").selectOption("");
  await optionsPage.locator("#favorite-filter").uncheck();
  pass("关键词与标签筛选");

  const downloadPromise = optionsPage.waitForEvent("download");
  await optionsPage.locator("#export-button").click();
  const download = await downloadPromise;
  await download.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
  assert.deepEqual(exported, seed);
  await optionsPage.locator("#import-file").setInputFiles(exportPath);
  await optionsPage.locator("#toast").filter({ hasText: "导入完成：0 条 Prompt，0 个风格块" }).waitFor();
  const afterImport = await optionsPage.evaluate(() => chrome.storage.local.get("promptAtelierData").then((result) => result.promptAtelierData));
  assert.deepEqual(afterImport, seed);
  pass("JSON 导出再导入数据完整");

  const imageFixture = path.join(root, "tests", "fixtures", "pixel.svg");
  await optionsPage.locator("#primary-add-button").click();
  await optionsPage.locator("#prompt-title").fill("带图测试 Prompt");
  await optionsPage.locator("#prompt-body").fill("用于验证本地图片持久化");
  await optionsPage.locator("#reference-images").setInputFiles(imageFixture);
  await optionsPage.locator("#result-image").setInputFiles(imageFixture);
  await optionsPage.locator("#prompt-form button[type='submit']").click();
  const imagePrompt = await optionsPage.evaluate(() => chrome.storage.local.get("promptAtelierData").then((result) => result.promptAtelierData.prompts.find((prompt) => prompt.title === "带图测试 Prompt")));
  assert.equal(imagePrompt.referenceImages.length, 1);
  assert.match(imagePrompt.referenceImages[0], /^data:image\/svg\+xml;base64,/);
  assert.match(imagePrompt.resultImage, /^data:image\/svg\+xml;base64,/);
  pass("参考图与结果缩略图本地持久化");

  await optionsPage.locator("#search-input").fill("");
  await optionsPage.locator("#tag-filter").selectOption("");
  const imageCard = optionsPage.locator(`.prompt-card[data-id="${imagePrompt.id}"]`);
  await imageCard.waitFor();
  await imageCard.getByRole("button", { name: "编辑" }).click();
  await optionsPage.locator("#prompt-title").fill("带图测试 Prompt（已编辑）");
  await optionsPage.locator("#prompt-form button[type='submit']").click();
  const editedCard = optionsPage.locator(`.prompt-card[data-id="${imagePrompt.id}"]`);
  await editedCard.getByRole("button", { name: "创建副本" }).click();
  const duplicate = await optionsPage.evaluate(() => chrome.storage.local.get("promptAtelierData").then((result) => result.promptAtelierData.prompts.find((prompt) => prompt.title === "带图测试 Prompt（已编辑）（副本）")));
  assert.ok(duplicate);
  optionsPage.once("dialog", (dialog) => dialog.accept());
  await optionsPage.locator(`.prompt-card[data-id="${duplicate.id}"]`).getByRole("button", { name: "删除" }).click();
  await optionsPage.waitForFunction((id) => !document.querySelector(`.prompt-card[data-id="${id}"]`), duplicate.id);
  pass("Prompt 新增、编辑、复制与删除");

  await optionsPage.locator('[data-view-target="styles"]').click();
  await optionsPage.locator("#add-style-button").click();
  await optionsPage.locator("#style-name").fill("临时品牌风格");
  await optionsPage.locator("#style-content").fill("初始风格内容");
  await optionsPage.locator("#style-brand").check();
  await optionsPage.locator("#style-form button[type='submit']").click();
  const temporaryStyle = await optionsPage.evaluate(() => chrome.storage.local.get("promptAtelierData").then((result) => result.promptAtelierData.styleBlocks.find((style) => style.name === "临时品牌风格")));
  assert.ok(temporaryStyle);
  const temporaryStyleCard = optionsPage.locator(`.style-card[data-id="${temporaryStyle.id}"]`);
  await temporaryStyleCard.getByRole("button", { name: "编辑" }).click();
  await optionsPage.locator("#style-content").fill("编辑后的风格内容");
  await optionsPage.locator("#style-form button[type='submit']").click();
  optionsPage.once("dialog", (dialog) => dialog.accept());
  await optionsPage.locator(`.style-card[data-id="${temporaryStyle.id}"]`).getByRole("button", { name: "删除" }).click();
  await optionsPage.waitForFunction((id) => !document.querySelector(`.style-card[data-id="${id}"]`), temporaryStyle.id);
  pass("风格块新增、编辑与删除");

  await optionsPage.evaluate((value) => chrome.storage.local.set({ promptAtelierData: value }), seed);

  const harness = await context.newPage();
  harness.on("pageerror", (error) => errors.push(error.message));
  await harness.goto("http://127.0.0.1:4173/tests/fixtures/input-harness.html");

  const textarea = harness.locator("#textarea");
  await textarea.click();
  await textarea.type("/p");
  const pickerSearch = harness.locator("#prompt-atelier-picker-host .pa-search");
  await pickerSearch.waitFor();
  assert.equal(await textarea.inputValue(), "已有内容：");
  await pickerSearch.press("Enter");
  await harness.waitForFunction(() => document.querySelector("#textarea").value.includes("--sref 123456789"));
  assert.match(await textarea.inputValue(), /--ar 16:9/);
  pass("/p 唤起并插入 textarea");

  await harness.reload();
  const plainInput = harness.locator("#plain-input");
  await plainInput.click();
  await plainInput.type("/p");
  const inputPickerSearch = harness.locator("#prompt-atelier-picker-host .pa-search");
  await inputPickerSearch.waitFor();
  await inputPickerSearch.press("Enter");
  await harness.waitForFunction(() => document.querySelector("#plain-input").value.includes("--sref 123456789"));
  assert.match(await plainInput.inputValue(), /开头｜结尾/);
  pass("普通 input 光标插入");

  await harness.reload();
  const richInput = harness.locator("#contenteditable");
  await richInput.click();
  await richInput.type("/p");
  const richPickerSearch = harness.locator("#prompt-atelier-picker-host .pa-search");
  await richPickerSearch.waitFor();
  await richPickerSearch.press("Enter");
  await harness.waitForFunction(() => document.querySelector("#contenteditable").textContent.includes("--sref 123456789"));
  assert.match(await richInput.textContent(), /透明玻璃香水瓶/);
  pass("富文本输入区插入");

  await harness.reload();
  await harness.locator(".fake-node").click();
  await worker.evaluate(() => chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => chrome.tabs.sendMessage(tab.id, { type: "OPEN_PROMPT_PICKER" })));
  const fallbackInsert = harness.locator("#prompt-atelier-picker-host .pa-insert");
  await fallbackInsert.waitFor();
  await fallbackInsert.click();
  await harness.locator("#prompt-atelier-picker-host .pa-toast").filter({ hasText: "当前控件无法直接插入，已复制" }).waitFor();
  pass("非标准节点复制回退");

  await harness.reload();
  await harness.locator("#textarea").click();
  await harness.locator("#textarea").type("/p");
  const overlaySearch = harness.locator("#prompt-atelier-picker-host .pa-search");
  await overlaySearch.fill("不存在");
  assert.equal(await harness.locator("#prompt-atelier-picker-host .pa-item").count(), 0);
  await overlaySearch.fill("香水");
  await harness.locator("#prompt-atelier-picker-host .pa-tag-select").selectOption("产品");
  assert.equal(await harness.locator("#prompt-atelier-picker-host .pa-item").count(), 1);
  await overlaySearch.press("ArrowDown");
  await overlaySearch.press("Escape");
  assert.equal(await harness.locator("#prompt-atelier-picker-host .pa-picker").count(), 0);
  pass("浮层搜索、标签和键盘操作");

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, failed: 0, checks }));
} finally {
  await context.close();
}

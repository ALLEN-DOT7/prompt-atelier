const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../shared/core.js");

function samplePrompt(overrides = {}) {
  return {
    id: "prompt_1",
    title: "电影感产品图",
    body: "一只玻璃香水瓶，置于黑色石台",
    tool: "Midjourney",
    params: { versionType: "--v", version: "6.1", aspectRatio: "16:9", styleReference: "123456" },
    otherParams: "",
    tags: ["产品", "电影感"],
    styleBlockIds: ["style_1"],
    referenceImages: [],
    resultImage: "",
    favorite: true,
    notes: "",
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides
  };
}

function sampleStyle(overrides = {}) {
  return {
    id: "style_1",
    name: "品牌蓝调",
    content: "深蓝与银灰配色，冷冽轮廓光",
    isBrandPreset: true,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides
  };
}

test("Midjourney 参数生成包含比例和风格参考", () => {
  const output = core.buildToolParameters(samplePrompt());
  assert.match(output, /--ar 16:9/);
  assert.match(output, /--sref 123456/);
  assert.match(output, /--v 6.1/);
});

test("合成器默认将风格放在基础 Prompt 前", () => {
  const output = core.composePrompt({ basePrompt: samplePrompt(), styleBlocks: [sampleStyle()] });
  assert.ok(output.indexOf("深蓝与银灰") < output.indexOf("玻璃香水瓶"));
});

test("合成器支持切换为基础 Prompt 在前", () => {
  const output = core.composePrompt({ basePrompt: samplePrompt(), styleBlocks: [sampleStyle()], order: "base-first" });
  assert.ok(output.indexOf("玻璃香水瓶") < output.indexOf("深蓝与银灰"));
});

test("现写内容覆盖已选基础 Prompt", () => {
  const output = core.composePrompt({ basePrompt: samplePrompt(), manualBase: "现写内容", styleBlocks: [] });
  assert.equal(output, "现写内容");
});

test("关键词可同时命中标题、正文和标签", () => {
  const prompts = [samplePrompt(), samplePrompt({ id: "prompt_2", title: "水彩人物", body: "女孩肖像", tags: ["插画"] })];
  assert.equal(core.filterPrompts(prompts, { query: "电影感" }).length, 1);
  assert.equal(core.filterPrompts(prompts, { query: "玻璃" }).length, 1);
  assert.equal(core.filterPrompts(prompts, { query: "插画" }).length, 1);
});

test("工具、标签、风格块和收藏筛选可组合", () => {
  const prompts = [samplePrompt(), samplePrompt({ id: "prompt_2", favorite: false, styleBlockIds: [] })];
  const result = core.filterPrompts(prompts, { tool: "Midjourney", tag: "产品", styleBlockId: "style_1", favoriteOnly: true });
  assert.deepEqual(result.map((item) => item.id), ["prompt_1"]);
});

test("导入合并不覆盖同 id 数据", () => {
  const existing = { version: 1, prompts: [samplePrompt()], styleBlocks: [sampleStyle()] };
  const incoming = {
    version: 1,
    prompts: [samplePrompt({ title: "不应覆盖" }), samplePrompt({ id: "prompt_2", title: "新增项" })],
    styleBlocks: [sampleStyle(), sampleStyle({ id: "style_2", name: "新增风格" })]
  };
  const result = core.mergeData(existing, incoming);
  assert.equal(result.data.prompts[0].title, "电影感产品图");
  assert.equal(result.addedPrompts, 1);
  assert.equal(result.addedStyles, 1);
});

test("无版本号或字段错误的导入文件直接报错", () => {
  assert.throws(() => core.validateImportData({ prompts: [], styleBlocks: [] }), /仅支持版本/);
  assert.throws(() => core.validateImportData({ version: 1, prompts: [{ id: "x" }], styleBlocks: [] }), /缺少标题/);
});

test("JSON 导出再导入后数据完整且重复导入不新增", () => {
  const original = {
    version: 1,
    prompts: [samplePrompt({
      referenceImages: ["data:image/png;base64,AAAA"],
      resultImage: "data:image/png;base64,BBBB"
    })],
    styleBlocks: [sampleStyle()]
  };
  const imported = core.parseImport(core.serializeData(original));
  assert.deepEqual(imported, original);
  const merged = core.mergeData(original, imported);
  assert.deepEqual(merged.data, original);
  assert.equal(merged.addedPrompts, 0);
  assert.equal(merged.addedStyles, 0);
});

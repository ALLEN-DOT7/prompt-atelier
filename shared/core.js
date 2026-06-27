(function (global) {
  "use strict";

  const SCHEMA_VERSION = 1;
  const TOOL_OPTIONS = Object.freeze([
    "Midjourney",
    "Stable Diffusion 系",
    "Nano Banana·Gemini",
    "即梦·可灵",
    "其他"
  ]);

  function createId(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  function createEmptyData() {
    return { version: SCHEMA_VERSION, prompts: [], styleBlocks: [] };
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function compactLines(parts) {
    return parts.map(cleanText).filter(Boolean).join("\n");
  }

  function buildToolParameters(prompt) {
    const params = prompt.params || {};
    const lines = [];

    if (prompt.tool === "Midjourney") {
      const tokens = [];
      if (cleanText(params.version)) {
        tokens.push(`${params.versionType === "--niji" ? "--niji" : "--v"} ${cleanText(params.version)}`);
      }
      const tokenFields = [
        ["aspectRatio", "--ar"],
        ["stylize", "--stylize"],
        ["chaos", "--chaos"],
        ["weird", "--weird"],
        ["seed", "--seed"],
        ["styleReference", "--sref"],
        ["characterReference", "--cref"],
        ["exclude", "--no"]
      ];
      tokenFields.forEach(([key, flag]) => {
        if (cleanText(params[key])) tokens.push(`${flag} ${cleanText(params[key])}`);
      });
      if (tokens.length) lines.push(tokens.join(" "));
    }

    if (prompt.tool === "Stable Diffusion 系") {
      const metadata = [];
      if (cleanText(params.checkpoint)) metadata.push(`模型: ${cleanText(params.checkpoint)}`);
      if (Array.isArray(params.loras)) {
        params.loras.forEach((lora) => {
          const name = cleanText(lora && lora.name);
          if (name) metadata.push(`LoRA: ${name}${cleanText(lora.weight) ? ` (${cleanText(lora.weight)})` : ""}`);
        });
      }
      if (cleanText(params.negativePrompt)) metadata.push(`负向 Prompt: ${cleanText(params.negativePrompt)}`);
      [
        ["sampler", "采样器"],
        ["steps", "步数"],
        ["cfg", "CFG"],
        ["seed", "Seed"],
        ["size", "尺寸"],
        ["upscale", "放大"]
      ].forEach(([key, label]) => {
        if (cleanText(params[key])) metadata.push(`${label}: ${cleanText(params[key])}`);
      });
      if (metadata.length) lines.push(metadata.join("；"));
    }

    if (prompt.tool === "Nano Banana·Gemini") {
      [
        ["baseInstruction", "基础指令"],
        ["reference", "参考图"],
        ["editInstruction", "局部编辑指令"],
        ["aspectRatio", "宽高比"]
      ].forEach(([key, label]) => {
        if (cleanText(params[key])) lines.push(`${label}：${cleanText(params[key])}`);
      });
    }

    if (prompt.tool === "即梦·可灵") {
      [
        ["style", "风格"],
        ["aspectRatio", "比例"],
        ["reference", "参考图"]
      ].forEach(([key, label]) => {
        if (cleanText(params[key])) lines.push(`${label}：${cleanText(params[key])}`);
      });
    }

    if (cleanText(prompt.otherParams)) lines.push(cleanText(prompt.otherParams));
    return compactLines(lines);
  }

  function promptBody(prompt) {
    return compactLines([prompt.body, buildToolParameters(prompt)]);
  }

  function composePrompt({ basePrompt, manualBase, styleBlocks, order = "styles-first" }) {
    const base = cleanText(manualBase) || (basePrompt ? promptBody(basePrompt) : "");
    const styles = (styleBlocks || []).map((style) => cleanText(style.content)).filter(Boolean).join("\n");
    return order === "base-first" ? compactLines([base, styles]) : compactLines([styles, base]);
  }

  function filterPrompts(prompts, filters) {
    const query = cleanText(filters.query).toLocaleLowerCase("zh-CN");
    return prompts.filter((prompt) => {
      const haystack = [prompt.title, prompt.body, ...(prompt.tags || [])].join(" ").toLocaleLowerCase("zh-CN");
      if (query && !haystack.includes(query)) return false;
      if (filters.tool && prompt.tool !== filters.tool) return false;
      if (filters.tag && !(prompt.tags || []).includes(filters.tag)) return false;
      if (filters.styleBlockId && !(prompt.styleBlockIds || []).includes(filters.styleBlockId)) return false;
      if (filters.favoriteOnly && !prompt.favorite) return false;
      return true;
    });
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function validateImportData(value) {
    assert(value && typeof value === "object" && !Array.isArray(value), "导入文件必须是 JSON 对象");
    assert(value.version === SCHEMA_VERSION, `仅支持版本 ${SCHEMA_VERSION} 的数据`);
    assert(Array.isArray(value.prompts), "prompts 必须是数组");
    assert(Array.isArray(value.styleBlocks), "styleBlocks 必须是数组");

    value.prompts.forEach((prompt, index) => {
      assert(prompt && typeof prompt === "object", `第 ${index + 1} 条 Prompt 格式错误`);
      assert(cleanText(prompt.id), `第 ${index + 1} 条 Prompt 缺少 id`);
      assert(cleanText(prompt.title), `第 ${index + 1} 条 Prompt 缺少标题`);
      assert(cleanText(prompt.body), `第 ${index + 1} 条 Prompt 缺少正文`);
      assert(TOOL_OPTIONS.includes(prompt.tool), `第 ${index + 1} 条 Prompt 的出图工具无效`);
      assert(Array.isArray(prompt.tags), `第 ${index + 1} 条 Prompt 的标签必须是数组`);
      assert(Array.isArray(prompt.referenceImages), `第 ${index + 1} 条 Prompt 的参考图必须是数组`);
      assert(Array.isArray(prompt.styleBlockIds), `第 ${index + 1} 条 Prompt 的风格块关联必须是数组`);
    });

    value.styleBlocks.forEach((style, index) => {
      assert(style && typeof style === "object", `第 ${index + 1} 个风格块格式错误`);
      assert(cleanText(style.id), `第 ${index + 1} 个风格块缺少 id`);
      assert(cleanText(style.name), `第 ${index + 1} 个风格块缺少名称`);
      assert(cleanText(style.content), `第 ${index + 1} 个风格块缺少内容`);
    });
    return value;
  }

  function mergeData(existing, incoming) {
    validateImportData(incoming);
    const promptIds = new Set(existing.prompts.map((item) => item.id));
    const styleIds = new Set(existing.styleBlocks.map((item) => item.id));
    const newPrompts = incoming.prompts.filter((item) => !promptIds.has(item.id));
    const newStyles = incoming.styleBlocks.filter((item) => !styleIds.has(item.id));
    return {
      data: {
        version: SCHEMA_VERSION,
        prompts: [...existing.prompts, ...newPrompts],
        styleBlocks: [...existing.styleBlocks, ...newStyles]
      },
      addedPrompts: newPrompts.length,
      addedStyles: newStyles.length
    };
  }

  function serializeData(data) {
    validateImportData(data);
    return JSON.stringify(data, null, 2);
  }

  function parseImport(text) {
    return validateImportData(JSON.parse(text));
  }

  const api = Object.freeze({
    SCHEMA_VERSION,
    TOOL_OPTIONS,
    createId,
    createEmptyData,
    buildToolParameters,
    promptBody,
    composePrompt,
    filterPrompts,
    validateImportData,
    mergeData,
    serializeData,
    parseImport
  });

  global.PromptAtelierCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);

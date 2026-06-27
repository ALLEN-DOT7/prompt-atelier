(function () {
  "use strict";

  const core = PromptAtelierCore;
  const store = PromptAtelierStorage;
  const config = PROMPT_ATELIER_CONFIG;

  let data = core.createEmptyData();
  let editingReferenceImages = [];
  let editingResultImage = "";
  let toastTimer = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const elements = {
    promptDialog: $("#prompt-dialog"),
    promptForm: $("#prompt-form"),
    styleDialog: $("#style-dialog"),
    styleForm: $("#style-form"),
    promptList: $("#prompt-list"),
    promptEmpty: $("#prompt-empty"),
    styleList: $("#style-list"),
    styleEmpty: $("#style-empty"),
    dynamicParams: $("#dynamic-params"),
    promptTool: $("#prompt-tool"),
    toast: $("#toast")
  };

  function setConfigText() {
    $$('[data-config="productName"]').forEach((node) => { node.textContent = config.productName; });
    $$('[data-config="productSubtitle"]').forEach((node) => { node.textContent = config.productSubtitle; });
    $$(".attribution").forEach((node) => {
      node.replaceChildren();
      node.append(`${config.attributionPrefix} `);
      const link = document.createElement("a");
      link.href = config.makerUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = config.makerName;
      node.append(link, ` ${config.attributionSuffix}`);
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
  }

  function allTags() {
    return [...new Set(data.prompts.flatMap((prompt) => prompt.tags || []))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function escapeAttribute(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function fillSelect(select, values, firstLabel) {
    const current = select.value;
    select.replaceChildren(new Option(firstLabel, ""));
    values.forEach((value) => select.add(new Option(value, value)));
    select.value = values.includes(current) ? current : "";
  }

  function renderFilters() {
    fillSelect($("#tool-filter"), core.TOOL_OPTIONS, "全部工具");
    fillSelect($("#tag-filter"), allTags(), "全部标签");
    const styleSelect = $("#style-filter");
    const current = styleSelect.value;
    styleSelect.replaceChildren(new Option("全部风格块", ""));
    data.styleBlocks.forEach((style) => styleSelect.add(new Option(style.name, style.id)));
    styleSelect.value = data.styleBlocks.some((style) => style.id === current) ? current : "";
  }

  function promptFilters() {
    return {
      query: $("#search-input").value,
      tool: $("#tool-filter").value,
      tag: $("#tag-filter").value,
      styleBlockId: $("#style-filter").value,
      favoriteOnly: $("#favorite-filter").checked
    };
  }

  function createButton(label, action, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.dataset.action = action;
    return button;
  }

  function renderPrompts() {
    const filtered = core.filterPrompts(data.prompts, promptFilters())
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || new Date(b.createdAt) - new Date(a.createdAt));
    elements.promptList.replaceChildren();

    filtered.forEach((prompt) => {
      const card = document.createElement("article");
      card.className = "prompt-card";
      card.dataset.id = prompt.id;

      const thumb = document.createElement("div");
      thumb.className = "prompt-thumb";
      if (prompt.resultImage) {
        const image = document.createElement("img");
        image.src = prompt.resultImage;
        image.alt = `${prompt.title} 结果缩略图`;
        thumb.append(image);
      }

      const body = document.createElement("div");
      body.className = "prompt-card-body";
      const kicker = document.createElement("div");
      kicker.className = "card-kicker";
      const tool = document.createElement("span");
      tool.className = "tool-badge";
      tool.textContent = prompt.tool;
      const favorite = createButton(prompt.favorite ? "★" : "☆", "favorite", `favorite-button${prompt.favorite ? " active" : ""}`);
      favorite.title = prompt.favorite ? "取消收藏" : "收藏";
      kicker.append(tool, favorite);

      const titleRow = document.createElement("div");
      titleRow.className = "card-title-row";
      const title = document.createElement("h3");
      title.textContent = prompt.title;
      titleRow.append(title);

      const excerpt = document.createElement("p");
      excerpt.className = "prompt-excerpt";
      excerpt.textContent = prompt.body;
      const tags = document.createElement("div");
      tags.className = "tag-row";
      (prompt.tags || []).slice(0, 5).forEach((tagValue) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = tagValue;
        tags.append(tag);
      });

      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(
        createButton("编辑", "edit"),
        createButton("复制文本", "copy"),
        createButton("创建副本", "duplicate"),
        createButton("删除", "delete", "danger-button")
      );
      body.append(kicker, titleRow, excerpt, tags, actions);
      card.append(thumb, body);
      elements.promptList.append(card);
    });

    elements.promptEmpty.hidden = filtered.length !== 0;
  }

  function renderStyles() {
    const styles = [...data.styleBlocks].sort((a, b) => Number(b.isBrandPreset) - Number(a.isBrandPreset) || new Date(b.createdAt) - new Date(a.createdAt));
    elements.styleList.replaceChildren();
    styles.forEach((style) => {
      const card = document.createElement("article");
      card.className = `style-card${style.isBrandPreset ? " brand-style" : ""}`;
      card.dataset.id = style.id;
      const head = document.createElement("div");
      head.className = "style-card-head";
      const title = document.createElement("h3");
      title.textContent = style.name;
      head.append(title);
      if (style.isBrandPreset) {
        const badge = document.createElement("span");
        badge.className = "brand-badge";
        badge.textContent = "品牌预设";
        head.append(badge);
      }
      const content = document.createElement("p");
      content.className = "style-content";
      content.textContent = style.content;
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(createButton("编辑", "edit"), createButton("复制内容", "copy"), createButton("删除", "delete", "danger-button"));
      card.append(head, content, actions);
      elements.styleList.append(card);
    });
    elements.styleEmpty.hidden = styles.length !== 0;
  }

  function checkboxList(container, items, selectedIds = []) {
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("span");
      empty.className = "check-option";
      empty.textContent = "暂无风格块";
      container.append(empty);
      return;
    }
    items.forEach((item) => {
      const label = document.createElement("label");
      label.className = "check-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = item.id;
      input.checked = selectedIds.includes(item.id);
      label.append(input, document.createTextNode(item.isBrandPreset ? `${item.name} · 品牌预设` : item.name));
      container.append(label);
    });
  }

  function renderComposer() {
    const base = $("#composer-base");
    const current = base.value;
    base.replaceChildren(new Option("不选择，直接现写", ""));
    data.prompts.forEach((prompt) => base.add(new Option(`${prompt.title} · ${prompt.tool}`, prompt.id)));
    base.value = data.prompts.some((prompt) => prompt.id === current) ? current : "";

    const selected = $$('#composer-styles input:checked').map((input) => input.value);
    checkboxList($("#composer-styles"), [...data.styleBlocks].sort((a, b) => Number(b.isBrandPreset) - Number(a.isBrandPreset)), selected);
    $$('#composer-styles input').forEach((input) => input.addEventListener("change", updateComposer));
    updateComposer();
  }

  function updateComposer() {
    const prompt = data.prompts.find((item) => item.id === $("#composer-base").value) || null;
    const styleIds = $$('#composer-styles input:checked').map((input) => input.value);
    const styles = styleIds.map((id) => data.styleBlocks.find((item) => item.id === id)).filter(Boolean);
    const output = core.composePrompt({
      basePrompt: prompt,
      manualBase: $("#composer-manual").value,
      styleBlocks: styles,
      order: $("#composer-order").value
    });
    $("#composer-output").value = output;
    $("#composer-char-count").textContent = `${output.length} 字符`;
    $("#copy-composed-button").disabled = !output;
  }

  function renderCounts() {
    $("#prompt-count").textContent = data.prompts.length;
    $("#style-count").textContent = data.styleBlocks.length;
    $("#stat-prompts").textContent = data.prompts.length;
    $("#stat-favorites").textContent = data.prompts.filter((prompt) => prompt.favorite).length;
    $("#stat-styles").textContent = data.styleBlocks.length;
  }

  function renderAll() {
    renderCounts();
    renderFilters();
    renderPrompts();
    renderStyles();
    renderComposer();
  }

  function renderToolOptions() {
    elements.promptTool.replaceChildren();
    core.TOOL_OPTIONS.forEach((tool) => elements.promptTool.add(new Option(tool, tool)));
  }

  const field = (label, key, value = "", type = "text", placeholder = "") => `
    <label class="field-label">${label}<input type="${type}" data-param="${key}" value="${escapeAttribute(value)}" placeholder="${placeholder}"></label>`;

  function renderParams(params = {}) {
    const tool = elements.promptTool.value;
    if (tool === "Midjourney") {
      elements.dynamicParams.innerHTML = `
        <label class="field-label">版本类型<select data-param="versionType"><option value="--v"${params.versionType !== "--niji" ? " selected" : ""}>--v</option><option value="--niji"${params.versionType === "--niji" ? " selected" : ""}>--niji</option></select></label>
        ${field("版本", "version", params.version, "text", "如 6.1")}
        ${field("比例 --ar", "aspectRatio", params.aspectRatio, "text", "如 16:9")}
        ${field("--stylize", "stylize", params.stylize)}
        ${field("--chaos", "chaos", params.chaos)}
        ${field("--weird", "weird", params.weird)}
        ${field("--seed", "seed", params.seed)}
        ${field("风格参考 --sref", "styleReference", params.styleReference, "text", "图片 URL 或代码")}
        ${field("角色参考 --cref", "characterReference", params.characterReference, "text", "图片 URL")}
        ${field("排除 --no", "exclude", params.exclude, "text", "不希望出现的内容")}`;
      return;
    }
    if (tool === "Stable Diffusion 系") {
      elements.dynamicParams.innerHTML = `
        ${field("模型 / Checkpoint", "checkpoint", params.checkpoint)}
        ${field("采样器", "sampler", params.sampler)}
        ${field("步数", "steps", params.steps, "number")}
        ${field("CFG", "cfg", params.cfg, "number")}
        ${field("Seed", "seed", params.seed)}
        ${field("尺寸", "size", params.size, "text", "如 1024×1024")}
        ${field("放大", "upscale", params.upscale, "text", "如 2x")}
        <label class="field-label full-span">负向 Prompt<textarea data-param="negativePrompt" rows="3">${escapeAttribute(params.negativePrompt || "")}</textarea></label>
        <div class="lora-list"><div class="form-section-title"><span>LoRA</span><button id="add-lora" type="button" class="add-row-button">＋ 添加 LoRA</button></div><div id="lora-rows"></div></div>`;
      const loras = Array.isArray(params.loras) && params.loras.length ? params.loras : [{ name: "", weight: "" }];
      loras.forEach((lora) => addLoraRow(lora));
      $("#add-lora").addEventListener("click", () => addLoraRow({ name: "", weight: "" }));
      return;
    }
    if (tool === "Nano Banana·Gemini") {
      elements.dynamicParams.innerHTML = `
        <label class="field-label full-span">基础指令<textarea data-param="baseInstruction" rows="3">${escapeAttribute(params.baseInstruction || "")}</textarea></label>
        ${field("参考图", "reference", params.reference, "text", "描述或引用说明")}
        ${field("宽高比", "aspectRatio", params.aspectRatio)}
        <label class="field-label full-span">局部编辑指令<textarea data-param="editInstruction" rows="3">${escapeAttribute(params.editInstruction || "")}</textarea></label>`;
      return;
    }
    if (tool === "即梦·可灵") {
      elements.dynamicParams.innerHTML = `
        ${field("风格", "style", params.style)}
        ${field("比例", "aspectRatio", params.aspectRatio)}
        ${field("参考图", "reference", params.reference, "text", "描述或引用说明")}`;
      return;
    }
    elements.dynamicParams.innerHTML = '<p class="full-span" style="margin:0;color:#7f8797;font-size:10px">该工具没有固定参数，请使用下方“其他参数”。</p>';
  }

  function addLoraRow(lora) {
    const row = document.createElement("div");
    row.className = "lora-row";
    row.innerHTML = `<input data-lora="name" value="${escapeAttribute(lora.name || "")}" placeholder="LoRA 名称"><input data-lora="weight" value="${escapeAttribute(lora.weight || "")}" placeholder="权重，如 0.8"><button type="button" class="remove-row" aria-label="删除 LoRA">×</button>`;
    $(".remove-row", row).addEventListener("click", () => row.remove());
    $("#lora-rows").append(row);
  }

  function readParams() {
    const params = {};
    $$('[data-param]', elements.dynamicParams).forEach((input) => { params[input.dataset.param] = input.value.trim(); });
    if (elements.promptTool.value === "Stable Diffusion 系") {
      params.loras = $$(".lora-row", elements.dynamicParams).map((row) => ({
        name: $('[data-lora="name"]', row).value.trim(),
        weight: $('[data-lora="weight"]', row).value.trim()
      })).filter((lora) => lora.name);
    }
    return params;
  }

  function parseTags(value) {
    return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
  }

  function renderExistingTags() {
    const container = $("#existing-tags");
    container.replaceChildren();
    allTags().forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `＋ ${tag}`;
      button.addEventListener("click", () => {
        const tags = parseTags($("#prompt-tags").value);
        if (!tags.includes(tag)) tags.push(tag);
        $("#prompt-tags").value = tags.join("，");
      });
      container.append(button);
    });
  }

  function renderImagePreviews() {
    const refs = $("#reference-preview");
    refs.replaceChildren();
    editingReferenceImages.forEach((source, index) => refs.append(createImagePreview(source, () => {
      editingReferenceImages.splice(index, 1);
      renderImagePreviews();
    })));
    const result = $("#result-preview");
    result.replaceChildren();
    if (editingResultImage) result.append(createImagePreview(editingResultImage, () => {
      editingResultImage = "";
      renderImagePreviews();
    }));
  }

  function createImagePreview(source, remove) {
    const wrapper = document.createElement("div");
    wrapper.className = "image-preview";
    const image = document.createElement("img");
    image.src = source;
    image.alt = "图片预览";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "×";
    button.addEventListener("click", remove);
    wrapper.append(image, button);
    return wrapper;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function openPromptDialog(prompt = null) {
    elements.promptForm.reset();
    $("#prompt-dialog-title").textContent = prompt ? "编辑 Prompt" : "新建 Prompt";
    $("#prompt-id").value = prompt ? prompt.id : "";
    $("#prompt-title").value = prompt ? prompt.title : "";
    $("#prompt-body").value = prompt ? prompt.body : "";
    elements.promptTool.value = prompt ? prompt.tool : "Midjourney";
    $("#prompt-other-params").value = prompt ? prompt.otherParams || "" : "";
    $("#prompt-tags").value = prompt ? (prompt.tags || []).join("，") : "";
    $("#prompt-favorite").checked = Boolean(prompt && prompt.favorite);
    $("#prompt-notes").value = prompt ? prompt.notes || "" : "";
    editingReferenceImages = prompt ? [...(prompt.referenceImages || [])] : [];
    editingResultImage = prompt ? prompt.resultImage || "" : "";
    renderParams(prompt ? prompt.params : {});
    renderExistingTags();
    checkboxList($("#prompt-style-links"), data.styleBlocks, prompt ? prompt.styleBlockIds || [] : []);
    renderImagePreviews();
    elements.promptDialog.showModal();
  }

  function openStyleDialog(style = null) {
    elements.styleForm.reset();
    $("#style-dialog-title").textContent = style ? "编辑风格块" : "新建风格块";
    $("#style-id").value = style ? style.id : "";
    $("#style-name").value = style ? style.name : "";
    $("#style-content").value = style ? style.content : "";
    $("#style-brand").checked = Boolean(style && style.isBrandPreset);
    elements.styleDialog.showModal();
  }

  async function persist(message) {
    await store.saveData(data);
    renderAll();
    if (message) showToast(message);
  }

  async function savePrompt(event) {
    event.preventDefault();
    const id = $("#prompt-id").value;
    const existing = data.prompts.find((prompt) => prompt.id === id);
    const now = new Date().toISOString();
    const prompt = {
      id: id || core.createId("prompt"),
      title: $("#prompt-title").value.trim(),
      body: $("#prompt-body").value.trim(),
      tool: elements.promptTool.value,
      params: readParams(),
      otherParams: $("#prompt-other-params").value.trim(),
      tags: parseTags($("#prompt-tags").value),
      styleBlockIds: $$('#prompt-style-links input:checked').map((input) => input.value),
      referenceImages: editingReferenceImages,
      resultImage: editingResultImage,
      favorite: $("#prompt-favorite").checked,
      notes: $("#prompt-notes").value.trim(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    if (existing) data.prompts[data.prompts.indexOf(existing)] = prompt;
    else data.prompts.push(prompt);
    await persist(existing ? "Prompt 已更新" : "Prompt 已保存");
    elements.promptDialog.close();
  }

  async function saveStyle(event) {
    event.preventDefault();
    const id = $("#style-id").value;
    const existing = data.styleBlocks.find((style) => style.id === id);
    const now = new Date().toISOString();
    const style = {
      id: id || core.createId("style"),
      name: $("#style-name").value.trim(),
      content: $("#style-content").value.trim(),
      isBrandPreset: $("#style-brand").checked,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    if (existing) data.styleBlocks[data.styleBlocks.indexOf(existing)] = style;
    else data.styleBlocks.push(style);
    await persist(existing ? "风格块已更新" : "风格块已保存");
    elements.styleDialog.close();
  }

  async function copyText(text, message = "已复制") {
    await navigator.clipboard.writeText(text);
    showToast(message);
  }

  async function handlePromptAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".prompt-card");
    const prompt = data.prompts.find((item) => item.id === card.dataset.id);
    if (!prompt) return;
    if (button.dataset.action === "edit") openPromptDialog(prompt);
    if (button.dataset.action === "copy") await copyText(core.promptBody(prompt), "Prompt 已复制");
    if (button.dataset.action === "favorite") {
      prompt.favorite = !prompt.favorite;
      prompt.updatedAt = new Date().toISOString();
      await persist(prompt.favorite ? "已收藏" : "已取消收藏");
    }
    if (button.dataset.action === "duplicate") {
      const now = new Date().toISOString();
      data.prompts.push({ ...structuredClone(prompt), id: core.createId("prompt"), title: `${prompt.title}（副本）`, createdAt: now, updatedAt: now });
      await persist("已创建副本");
    }
    if (button.dataset.action === "delete" && confirm(`确定删除“${prompt.title}”吗？此操作无法撤销。`)) {
      data.prompts = data.prompts.filter((item) => item.id !== prompt.id);
      await persist("Prompt 已删除");
    }
  }

  async function handleStyleAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".style-card");
    const style = data.styleBlocks.find((item) => item.id === card.dataset.id);
    if (!style) return;
    if (button.dataset.action === "edit") openStyleDialog(style);
    if (button.dataset.action === "copy") await copyText(style.content, "风格内容已复制");
    if (button.dataset.action === "delete" && confirm(`确定删除风格块“${style.name}”吗？关联关系也会移除。`)) {
      data.styleBlocks = data.styleBlocks.filter((item) => item.id !== style.id);
      data.prompts.forEach((prompt) => { prompt.styleBlockIds = (prompt.styleBlockIds || []).filter((id) => id !== style.id); });
      await persist("风格块已删除");
    }
  }

  function switchView(target) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.viewTarget === target));
    $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === `view-${target}`));
    const titles = { prompts: "Prompt 库", styles: "风格块", composer: "一致性合成器" };
    $("#view-title").textContent = titles[target];
    $("#primary-add-button").hidden = target !== "prompts";
  }

  function exportData() {
    const payload = core.serializeData(data);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompt-atelier-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("已导出全部数据");
  }

  async function importData(file) {
    const parsed = core.parseImport(await file.text());
    const result = core.mergeData(data, parsed);
    data = result.data;
    await persist(`导入完成：${result.addedPrompts} 条 Prompt，${result.addedStyles} 个风格块`);
  }

  function bindEvents() {
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.viewTarget)));
    $("#primary-add-button").addEventListener("click", () => openPromptDialog());
    $("#add-style-button").addEventListener("click", () => openStyleDialog());
    $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.closeDialog}`).close()));
    elements.promptTool.addEventListener("change", () => renderParams({}));
    elements.promptForm.addEventListener("submit", savePrompt);
    elements.styleForm.addEventListener("submit", saveStyle);
    elements.promptList.addEventListener("click", handlePromptAction);
    elements.styleList.addEventListener("click", handleStyleAction);
    ["#search-input", "#tool-filter", "#tag-filter", "#style-filter", "#favorite-filter"].forEach((selector) => {
      $(selector).addEventListener(selector === "#search-input" ? "input" : "change", renderPrompts);
    });
    ["#composer-base", "#composer-order"].forEach((selector) => $(selector).addEventListener("change", updateComposer));
    $("#composer-manual").addEventListener("input", updateComposer);
    $("#copy-composed-button").addEventListener("click", () => copyText($("#composer-output").value, "最终 Prompt 已复制"));
    $("#reference-images").addEventListener("change", async (event) => {
      const images = await Promise.all([...event.target.files].map(readFileAsDataUrl));
      editingReferenceImages.push(...images);
      renderImagePreviews();
      event.target.value = "";
    });
    $("#result-image").addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (file) editingResultImage = await readFileAsDataUrl(file);
      renderImagePreviews();
      event.target.value = "";
    });
    $("#export-button").addEventListener("click", exportData);
    $("#import-button").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      try { await importData(file); }
      catch (error) { showToast(`导入失败：${error.message}`); }
      event.target.value = "";
    });
    $("#shortcut-button").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));
  }

  async function init() {
    setConfigText();
    renderToolOptions();
    bindEvents();
    data = await store.loadData();
    core.validateImportData(data);
    renderAll();
  }

  init().catch((error) => {
    console.error(error);
    showToast(`启动失败：${error.message}`);
  });
})();

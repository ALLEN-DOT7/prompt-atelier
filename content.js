(function () {
  "use strict";

  const core = PromptAtelierCore;
  const store = PromptAtelierStorage;
  const config = PROMPT_ATELIER_CONFIG;
  const HOST_ID = "prompt-atelier-picker-host";

  let host = null;
  let shadow = null;
  let pickerOpen = false;
  let data = core.createEmptyData();
  let visiblePrompts = [];
  let selectedIndex = 0;
  let savedTarget = null;
  let savedSelection = null;
  let savedRange = null;
  let toastTimer = 0;

  const css = `
    :host { all: initial; color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    button, input, select { font: inherit; }
    .pa-backdrop { position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: start center; padding-top: min(12vh, 110px); background: rgba(4,6,10,.42); backdrop-filter: blur(3px); font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #f5f7fb; }
    .pa-picker { width: min(680px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 140px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #343b4c; border-radius: 18px; background: #11141b; box-shadow: 0 35px 110px rgba(0,0,0,.58); }
    .pa-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 20px 14px; }
    .pa-brand { display: flex; align-items: center; gap: 10px; }
    .pa-mark { width: 31px; height: 31px; display: grid; place-items: center; border-radius: 9px; color: #10130b; background: #b9ff5a; font-size: 14px; font-weight: 900; }
    .pa-brand strong, .pa-brand small { display: block; }
    .pa-brand strong { font-size: 13px; letter-spacing: -.01em; }
    .pa-brand small { margin-top: 2px; color: #7f8899; font-size: 9px; }
    .pa-close { width: 30px; height: 30px; border: 0; border-radius: 8px; color: #858e9f; background: #1c202a; cursor: pointer; }
    .pa-close:hover { color: #fff; }
    .pa-search-row { display: grid; grid-template-columns: 1fr 160px; gap: 8px; padding: 0 20px 13px; }
    .pa-input-wrap { position: relative; }
    .pa-input-wrap span { position: absolute; left: 12px; top: 9px; color: #8d96a7; font-size: 18px; }
    .pa-search, .pa-tag-select { width: 100%; height: 39px; border: 1px solid #282e3b; border-radius: 9px; color: #f5f7fb; background: #0c0f15; }
    .pa-search { padding: 0 12px 0 37px; }
    .pa-tag-select { padding: 0 10px; font-size: 10px; }
    .pa-search:focus, .pa-tag-select:focus, button:focus-visible { outline: 2px solid #b9ff5a; outline-offset: 1px; }
    .pa-body { min-height: 250px; display: grid; grid-template-columns: minmax(0, 1fr) 220px; border-top: 1px solid #222734; border-bottom: 1px solid #222734; overflow: hidden; }
    .pa-list { min-height: 260px; max-height: 410px; padding: 8px; overflow-y: auto; border-right: 1px solid #222734; }
    .pa-item { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px; border: 1px solid transparent; border-radius: 10px; color: #bdc4d0; background: transparent; text-align: left; cursor: pointer; }
    .pa-item:hover { background: #181c25; }
    .pa-item.selected { border-color: rgba(185,255,90,.32); background: rgba(185,255,90,.08); }
    .pa-item-title { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; color: #f3f5f9; font-size: 11px; font-weight: 750; }
    .pa-star { color: #ffd95a; }
    .pa-item p { margin: 0; overflow: hidden; color: #858e9f; font-size: 9px; line-height: 1.55; white-space: nowrap; text-overflow: ellipsis; }
    .pa-tool { align-self: start; padding: 4px 6px; border-radius: 99px; color: #b9ff5a; background: rgba(185,255,90,.09); font-size: 8px; white-space: nowrap; }
    .pa-empty { height: 100%; min-height: 240px; display: grid; place-items: center; padding: 30px; color: #737c8d; font-size: 10px; text-align: center; }
    .pa-side { display: flex; flex-direction: column; min-width: 0; padding: 14px; background: #0e1117; }
    .pa-side-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; color: #aab2c0; font-size: 9px; font-weight: 800; }
    .pa-styles { display: flex; flex-wrap: wrap; align-content: flex-start; gap: 5px; max-height: 130px; overflow-y: auto; }
    .pa-style { position: relative; }
    .pa-style input { position: absolute; opacity: 0; pointer-events: none; }
    .pa-style span { display: block; padding: 6px 8px; border: 1px solid #2a303d; border-radius: 7px; color: #858e9f; background: #151922; font-size: 8px; cursor: pointer; }
    .pa-style input:checked + span { border-color: rgba(185,255,90,.38); color: #e9f7d6; background: rgba(185,255,90,.1); }
    .pa-preview-label { margin: 14px 0 7px; color: #727b8c; font-size: 8px; font-weight: 800; }
    .pa-preview { flex: 1; min-height: 95px; max-height: 175px; margin: 0; overflow: auto; color: #aeb6c4; font-size: 8px; line-height: 1.6; white-space: pre-wrap; }
    .pa-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; }
    .pa-hint { color: #697283; font-size: 8px; }
    .pa-hint kbd { padding: 2px 4px; border: 1px solid #343b49; border-radius: 4px; color: #9ca5b5; background: #181c25; }
    .pa-buttons { display: flex; gap: 7px; }
    .pa-button { min-height: 34px; padding: 0 13px; border: 1px solid #2c3341; border-radius: 8px; color: #d9dee7; background: #1a1e27; font-size: 9px; font-weight: 750; cursor: pointer; }
    .pa-button.primary { border-color: #b9ff5a; color: #11140c; background: #b9ff5a; }
    .pa-button:disabled { opacity: .4; cursor: not-allowed; }
    .pa-footer { display: flex; justify-content: space-between; padding: 0 20px 12px; color: #626b7c; font-size: 8px; }
    .pa-footer a { color: #a3dc54; text-decoration: none; }
    .pa-toast { position: fixed; left: 50%; bottom: 30px; z-index: 2147483647; padding: 10px 14px; border: 1px solid rgba(185,255,90,.35); border-radius: 9px; color: #f5f7fb; background: #171b22; box-shadow: 0 20px 65px rgba(0,0,0,.5); font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; font-size: 10px; transform: translate(-50%, 12px); opacity: 0; pointer-events: none; transition: .18s ease; }
    .pa-toast.visible { transform: translate(-50%, 0); opacity: 1; }
    @media (max-width: 620px) { .pa-backdrop { padding-top: 18px; } .pa-picker { max-height: calc(100vh - 36px); } .pa-body { grid-template-columns: 1fr; overflow-y: auto; } .pa-list { border-right: 0; border-bottom: 1px solid #222734; } .pa-side { min-height: 180px; } .pa-search-row { grid-template-columns: 1fr; } .pa-hint { display: none; } }
  `;

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    const toast = document.createElement("div");
    toast.className = "pa-toast";
    toast.setAttribute("role", "status");
    shadow.append(style, toast);
    document.documentElement.append(host);
  }

  function deepActiveElement() {
    let active = document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
    return active;
  }

  function isTextInput(element) {
    if (!(element instanceof HTMLInputElement)) return false;
    return ["text", "search", "url", "email", "tel", "password"].includes(element.type) && !element.readOnly && !element.disabled;
  }

  function isEditable(element) {
    return Boolean(element && (isTextInput(element) || (element instanceof HTMLTextAreaElement && !element.readOnly && !element.disabled) || element.isContentEditable));
  }

  function captureTarget() {
    const target = deepActiveElement();
    savedTarget = isEditable(target) ? target : null;
    savedSelection = null;
    savedRange = null;
    if (!savedTarget) return;
    if (isTextInput(savedTarget) || savedTarget instanceof HTMLTextAreaElement) {
      savedSelection = { start: savedTarget.selectionStart, end: savedTarget.selectionEnd };
      return;
    }
    const selection = document.getSelection();
    if (selection && selection.rangeCount && savedTarget.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
  }

  function attributionNode() {
    const span = document.createElement("span");
    span.append(`${config.attributionPrefix} `);
    const link = document.createElement("a");
    link.href = config.makerUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = config.makerName;
    span.append(link, ` ${config.attributionSuffix}`);
    return span;
  }

  function buildPicker() {
    const backdrop = document.createElement("div");
    backdrop.className = "pa-backdrop";
    backdrop.innerHTML = `
      <section class="pa-picker" role="dialog" aria-modal="true" aria-label="快捷取词器">
        <header class="pa-head"><div class="pa-brand"><div class="pa-mark">P</div><div><strong></strong><small></small></div></div><button class="pa-close" type="button" aria-label="关闭">×</button></header>
        <div class="pa-search-row"><label class="pa-input-wrap"><span>⌕</span><input class="pa-search" type="search" placeholder="搜索标题、正文或标签"></label><select class="pa-tag-select" aria-label="按标签筛选"><option value="">全部标签</option></select></div>
        <div class="pa-body"><div class="pa-list" role="listbox"></div><aside class="pa-side"><div class="pa-side-title"><span>叠加风格块</span><span>可多选</span></div><div class="pa-styles"></div><div class="pa-preview-label">最终文本预览</div><pre class="pa-preview"></pre></aside></div>
        <div class="pa-actions"><div class="pa-hint"><kbd>↑</kbd> <kbd>↓</kbd> 选择　<kbd>Enter</kbd> 插入　<kbd>Esc</kbd> 关闭</div><div class="pa-buttons"><button class="pa-button pa-copy" type="button">复制</button><button class="pa-button primary pa-insert" type="button">插入到输入框</button></div></div>
        <footer class="pa-footer"><span class="pa-attribution"></span><span>数据仅保存在本机</span></footer>
      </section>`;
    backdrop.querySelector(".pa-brand strong").textContent = config.productName;
    backdrop.querySelector(".pa-brand small").textContent = config.productSubtitle;
    backdrop.querySelector(".pa-attribution").replaceWith(attributionNode());
    return backdrop;
  }

  function selectedPrompt() {
    return visiblePrompts[selectedIndex] || null;
  }

  function selectedStyles() {
    return [...shadow.querySelectorAll(".pa-style input:checked")]
      .map((input) => data.styleBlocks.find((style) => style.id === input.value))
      .filter(Boolean);
  }

  function composedText() {
    const prompt = selectedPrompt();
    return prompt ? core.composePrompt({ basePrompt: prompt, styleBlocks: selectedStyles(), order: "styles-first" }) : "";
  }

  function renderPreview() {
    const output = composedText();
    shadow.querySelector(".pa-preview").textContent = output || "选择一条 Prompt 后显示";
    shadow.querySelector(".pa-insert").disabled = !output;
    shadow.querySelector(".pa-copy").disabled = !output;
  }

  function renderPromptList() {
    const list = shadow.querySelector(".pa-list");
    list.replaceChildren();
    if (!visiblePrompts.length) {
      const empty = document.createElement("div");
      empty.className = "pa-empty";
      empty.textContent = data.prompts.length ? "没有符合条件的 Prompt" : "Prompt 库还是空的，请先到管理页添加内容";
      list.append(empty);
      renderPreview();
      return;
    }
    if (selectedIndex >= visiblePrompts.length) selectedIndex = 0;
    visiblePrompts.forEach((prompt, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pa-item${index === selectedIndex ? " selected" : ""}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === selectedIndex));
      const text = document.createElement("div");
      const title = document.createElement("div");
      title.className = "pa-item-title";
      if (prompt.favorite) {
        const star = document.createElement("span");
        star.className = "pa-star";
        star.textContent = "★";
        title.append(star);
      }
      title.append(document.createTextNode(prompt.title));
      const excerpt = document.createElement("p");
      excerpt.textContent = prompt.body;
      text.append(title, excerpt);
      const tool = document.createElement("span");
      tool.className = "pa-tool";
      tool.textContent = prompt.tool;
      button.append(text, tool);
      button.addEventListener("click", () => {
        selectedIndex = index;
        renderPromptList();
      });
      button.addEventListener("dblclick", insertSelected);
      list.append(button);
    });
    list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
    renderPreview();
  }

  function applyFilters() {
    const query = shadow.querySelector(".pa-search").value;
    const tag = shadow.querySelector(".pa-tag-select").value;
    visiblePrompts = core.filterPrompts(data.prompts, { query, tag })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || new Date(b.createdAt) - new Date(a.createdAt));
    selectedIndex = 0;
    renderPromptList();
  }

  function renderPickerData() {
    const tags = [...new Set(data.prompts.flatMap((prompt) => prompt.tags || []))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const tagSelect = shadow.querySelector(".pa-tag-select");
    tags.forEach((tag) => tagSelect.add(new Option(tag, tag)));
    const styles = shadow.querySelector(".pa-styles");
    [...data.styleBlocks].sort((a, b) => Number(b.isBrandPreset) - Number(a.isBrandPreset)).forEach((style) => {
      const label = document.createElement("label");
      label.className = "pa-style";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = style.id;
      const text = document.createElement("span");
      text.textContent = style.isBrandPreset ? `${style.name} · 品牌` : style.name;
      input.addEventListener("change", renderPreview);
      label.append(input, text);
      styles.append(label);
    });
    applyFilters();
  }

  async function openPicker() {
    if (pickerOpen) return;
    captureTarget();
    ensureHost();
    data = await store.loadData();
    core.validateImportData(data);
    const picker = buildPicker();
    shadow.append(picker);
    pickerOpen = true;
    renderPickerData();
    shadow.querySelector(".pa-close").addEventListener("click", closePicker);
    picker.addEventListener("mousedown", (event) => { if (event.target === picker) closePicker(); });
    shadow.querySelector(".pa-search").addEventListener("input", applyFilters);
    shadow.querySelector(".pa-tag-select").addEventListener("change", applyFilters);
    shadow.querySelector(".pa-copy").addEventListener("click", copySelected);
    shadow.querySelector(".pa-insert").addEventListener("click", insertSelected);
    shadow.querySelector(".pa-search").focus();
  }

  function closePicker() {
    shadow?.querySelector(".pa-backdrop")?.remove();
    pickerOpen = false;
  }

  function showToast(message) {
    ensureHost();
    const toast = shadow.querySelector(".pa-toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function legacyCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.documentElement.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("浏览器拒绝了剪贴板写入");
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      legacyCopy(text);
    }
  }

  async function copySelected() {
    const text = composedText();
    if (!text) return;
    await writeClipboard(text);
    closePicker();
    showToast("已复制，Ctrl+V 粘贴即可");
  }

  function insertIntoTarget(text) {
    if (!savedTarget || !savedTarget.isConnected || !isEditable(savedTarget)) return false;
    savedTarget.focus();
    if (isTextInput(savedTarget) || savedTarget instanceof HTMLTextAreaElement) {
      const start = savedSelection?.start ?? savedTarget.selectionStart ?? savedTarget.value.length;
      const end = savedSelection?.end ?? savedTarget.selectionEnd ?? start;
      savedTarget.setRangeText(text, start, end, "end");
      savedTarget.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      return true;
    }
    if (savedTarget.isContentEditable) {
      const selection = document.getSelection();
      selection.removeAllRanges();
      if (savedRange && savedTarget.contains(savedRange.commonAncestorContainer)) selection.addRange(savedRange);
      else {
        const range = document.createRange();
        range.selectNodeContents(savedTarget);
        range.collapse(false);
        selection.addRange(range);
      }
      return document.execCommand("insertText", false, text);
    }
    return false;
  }

  async function insertSelected() {
    const text = composedText();
    if (!text) return;
    closePicker();
    if (insertIntoTarget(text)) {
      showToast("Prompt 已插入");
      return;
    }
    await writeClipboard(text);
    showToast("当前控件无法直接插入，已复制，Ctrl+V 粘贴即可");
  }

  function removeSlashCommand(target) {
    if (isTextInput(target) || target instanceof HTMLTextAreaElement) {
      const caret = target.selectionStart;
      if (caret === null || target.selectionEnd !== caret || target.value.slice(Math.max(0, caret - 2), caret) !== "/p") return false;
      target.setRangeText("", caret - 2, caret, "end");
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward", data: null }));
      return true;
    }
    if (target.isContentEditable) {
      const selection = document.getSelection();
      if (!selection || !selection.isCollapsed || !selection.rangeCount) return false;
      const node = selection.anchorNode;
      const offset = selection.anchorOffset;
      if (!node || node.nodeType !== Node.TEXT_NODE || offset < 2 || node.textContent.slice(offset - 2, offset) !== "/p") return false;
      node.deleteData(offset - 2, 2);
      const range = document.createRange();
      range.setStart(node, offset - 2);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward", data: null }));
      return true;
    }
    return false;
  }

  document.addEventListener("input", (event) => {
    if (event.composedPath().includes(host)) return;
    const target = deepActiveElement();
    if (!isEditable(target) || !removeSlashCommand(target)) return;
    queueMicrotask(() => openPicker().catch((error) => showToast(`取词器启动失败：${error.message}`)));
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!pickerOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!visiblePrompts.length) return;
      selectedIndex = (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + visiblePrompts.length) % visiblePrompts.length;
      renderPromptList();
      return;
    }
    if (event.key === "Enter" && !["SELECT", "BUTTON"].includes(event.target?.tagName)) {
      event.preventDefault();
      insertSelected();
    }
  }, true);

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "OPEN_PROMPT_PICKER") {
      openPicker().catch((error) => showToast(`取词器启动失败：${error.message}`));
    }
  });
})();

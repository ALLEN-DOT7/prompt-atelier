(function (global) {
  "use strict";

  const DATA_KEY = "promptAtelierData";

  async function loadData() {
    const result = await chrome.storage.local.get(DATA_KEY);
    return result[DATA_KEY] || global.PromptAtelierCore.createEmptyData();
  }

  async function saveData(data) {
    await chrome.storage.local.set({ [DATA_KEY]: data });
  }

  global.PromptAtelierStorage = Object.freeze({ DATA_KEY, loadData, saveData });
})(globalThis);

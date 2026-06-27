importScripts("shared/core.js");

const DATA_KEY = "promptAtelierData";

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(DATA_KEY);
  if (!stored[DATA_KEY]) {
    await chrome.storage.local.set({ [DATA_KEY]: PromptAtelierCore.createEmptyData() });
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-prompt-picker") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "OPEN_PROMPT_PICKER" }, () => void chrome.runtime.lastError);
});

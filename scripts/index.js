import {
  onceReady,
  onceInit,
  renderSidebarTab,
  renderJournalSheet
} from "./hooks.js";

Hooks.once("ready", onceReady);
Hooks.once("init", onceInit);
Hooks.on("renderSidebarTab", renderSidebarTab);
Hooks.on("renderJournalSheet", renderJournalSheet);



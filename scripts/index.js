import {
  onceReady,
  renderSidebarTab,
  renderJournalSheet
} from "./hooks.js";

Hooks.once("ready", onceReady);
Hooks.on("renderSidebarTab", renderSidebarTab);
Hooks.on("renderJournalSheet", renderJournalSheet);



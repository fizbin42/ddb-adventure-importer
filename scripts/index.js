import {
  onceReady,
  renderSidebarTab
} from "./hooks.js";

Hooks.once("ready", onceReady);
Hooks.on("renderSidebarTab", renderSidebarTab);



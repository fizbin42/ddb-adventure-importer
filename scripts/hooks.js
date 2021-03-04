import registerGameSettings from "./hooks/ready/registerGameSettings.js";
import addImportDDB from "./hooks/renderSidebarTab/addImportDDB.js";
import * as content from "./content.js";
import { loadAdventures } from "./utils.js";

export function onceReady() {
  content.loadTypes();
  registerGameSettings();
  loadAdventures();
}

/* eslint-disable no-unused-vars */
export function renderSidebarTab(app, html) {
  addImportDDB(app, html);
}
/* eslint-enable no-unused-vars */

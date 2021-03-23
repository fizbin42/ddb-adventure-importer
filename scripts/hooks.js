import registerGameSettings from "./hooks/ready/registerGameSettings.js";
import addImportDDB from "./hooks/renderSidebarTab/addImportDDB.js";
import narrate from "./hooks/renderJournalSheet/narrate.js";
import * as content from "./content.js";
import { loadAdventures } from "./utils.js";

export function onceReady() {
  content.loadTypes();
  registerGameSettings();
  loadAdventures();
}

export function onceInit() {
  // eslint-disable-next-line no-undef
  if (CONST && CONST.FOLDER_MAX_DEPTH < 5) {
    // eslint-disable-next-line no-undef
    CONST.FOLDER_MAX_DEPTH = 5;
  }
}

/* eslint-disable no-unused-vars */
export function renderSidebarTab(app, html) {
  addImportDDB(app, html);
}
export function renderJournalSheet(sheet, html, data) {
  narrate(html);
}
/* eslint-enable no-unused-vars */

import { logger } from "./logger.js";
import * as content from "./content.js";
import { getAPIServer } from "./utils.js";

const normalizeName = (value) => {
    return value.toLowerCase().replaceAll(/[\W_]+/ig, "");
};

export const Importer = class {

    constructor() {
      this.data = {};
      this.refs = {};
      this.compendiums = {};
    }

    async linkJournalEntry (entry) {
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(entry.data.content, 'text/html');
      
        for (const node of doc.querySelectorAll('a[href^="https://www.dndbeyond.com/"]')) { // For content from DNDBeyond
            if (this.data.index[node.href]) {
                let e = content.get(this.data.index[node.href], "JournalEntry", true);
                if (e) {
                    let refItem = "@JournalEntry[" + e.id + "]{" + e.name + "}";
                    node.replaceWith(refItem);
                } else {
                    // eslint-disable-next-line no-console
                    console.error("linkJournalEntry, Not Found: " + node.href + " ID: " + this.data.index[node.href]);
                }
            }
        }
        for (const node of doc.querySelectorAll('a[guid]')) { // For custom content
            let guid = node.getAttribute("guid");
            let e = content.get(guid, "JournalEntry");
            if (e) {
                let refItem = "@JournalEntry[" + e.id + "]{" + e.name + "}";
                node.replaceWith(refItem);
            } else {
                // eslint-disable-next-line no-console
                console.error("linkJournalEntry, Not found: " + guid);
            }
        }
        await entry.update({ content: doc.body.outerHTML });
        return entry;
      }
      
    async linkJournalEntries() {
        const entries = game.journal.filter((entry) => entry.data.flags.ddbai);
        for (let e of entries) {
            // eslint-disable-next-line no-await-in-loop
            await this.linkJournalEntry(e);
        }
    }
      
    linkCompendium(content, type, asText = false) {
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(content, 'text/html');
        const items = this.compendiums[type].index;
        for (const node of doc.querySelectorAll('a[href^="https://www.dndbeyond.com/' + type + '/"]')) {
            let itemName = normalizeName(node.href.substring(node.href.lastIndexOf('/') + 1));
            let item = items.find((i) => normalizeName(i.name) === itemName);
            if (item) {
                let refItem = "@Compendium[world." + this.compendiums[type].compendium.metadata.name + "." + item._id + "]{" + item.name + "}";
                node.replaceWith(refItem);
            }
        }
        if (asText) {
            return doc.body.textContent;
        } else {
            return doc.body.innerHTML;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async linkRollTable(entry) {
        /* eslint-disable no-await-in-loop */
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(entry.data.content, 'text/html');
        for (const node of doc.querySelectorAll('div[data-type="rolltable"]')) {
            let rollTable = content.get(node.getAttribute("data-id"), "RollTable");
            if (rollTable) {
                node.innerHTML = `<div style="text-align: right;"><i>Roll Table: </i>@RollTable[${rollTable._id}]{${rollTable.name}}</div><br />`;
                node.removeAttribute("data-type");
                node.removeAttribute("data-id");
            } else {
                logger.error("RollTable " + node.getAttribute("data-id") + " not found.");
            }
        }
        await entry.update({ content: doc.body.innerHTML });
    }
      
    async linkJournalCompendium (entry, type) {
        if (entry.constructor.name == "RollTable") {
            for (let r of entry.data.results) {
                r.text = this.linkCompendium(r.text, type);
            }
            await entry.update({ results: entry.data.results });
        } else {
            await entry.update({ content: this.linkCompendium(entry.data.content, type) });
        }
    }
      
    async linkEntry (entry) {
        /* eslint-disable no-await-in-loop */
        for (let c in this.compendiums) {
            await this.linkJournalCompendium(entry, c);
        }
        if (entry.constructor.name == "JournalEntry") {
            await this.linkRollTable(entry);
        }
        if (entry.constructor.name == "RollTable") {
            const domparser = new DOMParser();
            for (let r of entry.data.results) {
                const doc = domparser.parseFromString(r.text, 'text/html');
                r.text = doc.body.textContent;
            }
            await entry.update({ results: entry.data.results });
        }
        /* eslint-enable no-await-in-loop */
    }
      
    async linkEntries (entries) {
        /* eslint-disable no-await-in-loop */
        for (let entry of entries) {
            await this.linkEntry(entry);
        }
        /* eslint-enable no-await-in-loop */
    }

    async link () {
        logger.info("Correcting links in journals entries...");
        this.compendiums = {
            "magic-items": {
                "name": game.settings.get("ddb-importer", "entity-item-compendium"),
            },
            "monsters": {
                "name": game.settings.get("ddb-importer", "entity-monster-compendium"),
            },
            "spells": {
                "name": game.settings.get("ddb-importer", "entity-spell-compendium"),
            },
            "equipment": {
                "name": game.settings.get("ddb-importer", "entity-item-compendium"),
            }
        };
        /* eslint-disable no-await-in-loop */
        for (let c in this.compendiums) {
            this.compendiums[c].compendium = game.packs.get(this.compendiums[c].name);
            this.compendiums[c].index = await this.compendiums[c].compendium.getIndex();
        }
        /* eslint-enable no-await-in-loop */
        
        await this.linkEntries(game.journal.filter((entry) => entry.data.flags.ddbai));
        await this.linkEntries(game.tables.filter((entry) => entry.data.flags.ddbai));
        await content.linkAll();
        logger.log("Correcting links: done.");
    }

    async createEntities (node, basesort) {
        if (basesort === undefined) {
            basesort = {
                attribute: "sort",
                value: undefined
            };
        }
        for (let t in node.data) {
            // eslint-disable-next-line no-await-in-loop
            await content.set(node.data[t], "Folder", basesort);
        }
        for (let t in node.entities) {
            for (let e of node.entities[t]) {
                // eslint-disable-next-line no-await-in-loop
                await content.set(e.data, e.type);
            }
        }
        for (let c of node.childrens) {
            // eslint-disable-next-line no-await-in-loop
            await this.createEntities(c, basesort);
        }
    }

    async createFolders (node, type, basesort) {
        if (basesort === undefined) {
            basesort = {
                attribute: "sort",
                value: undefined
            };
        }
        if (type in node.data) {
            await content.set(node.data[type], "Folder", basesort);
        }
        await Promise.all(node.childrens.map((c) => {
            return this.createFolders(c, type, basesort);
        }));
        //for (let c of node.childrens) {
            // eslint-disable-next-line no-await-in-loop
        //    await this.createFolders(c, type, basesort);
        //}
    }

    async process (adventure) {
        let works = [];
        for (let t in content.MANAGED_ENTITIES) {
            works.push(this.createFolders(this.data, t));
        }
        await Promise.all(works);
        
        // await this.createEntities(this.data);
        // await this.linkJournalEntries();
        // await this.link();
        game.settings.set(
            "ddb-adventure-importer",
            "current-book",
            adventure
        );
        logger.info("Importing done.");
    }

    load(adventure, workspace) {
        this.adventure = adventure;
        logger.info('Contacting importer API...');
        let branch = "main";
        if (workspace) {
            branch = workspace;
        } else {
            branch = "main";
        }
        const url = getAPIServer() + "/api/adventure/" + adventure + "/" + branch;
        let headers = new Headers();
        headers.append('Authorization', 'JWT ' + game.settings.get("ddb-adventure-importer", "patreon-key"));

        return fetch(url, { method: 'GET', headers: headers }).then(async (result) => {
            logger.info('Response received, 200 OK');
            this.data = await result.json();
            this.process(adventure);
        }, (error) => {
            logger.error('REST GET request failed to importer API: ' + error.message);
        });
    }
};

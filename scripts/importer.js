import { logger } from "./logger.js";
import * as content from "./content.js";
import * as utils from "./utils.js";

const normalizeName = (value) => {
    return value.toLowerCase().replaceAll(/[\W_]+/ig, "");
};

export const Importer = class {

    constructor() {
      this.data = {};
      this.refs = {};
      this.linkFailed = {};
      this.fromCompendium = false;
      if (utils.moduleActive("ddb-importer")) {
            this.compendiums = {
                "Actor": {
                    "name": game.settings.get("ddb-importer", "entity-monster-compendium"),
                },
                "Item": {
                    "name": game.settings.get("ddb-importer", "entity-item-compendium"),
                },
                "Spell": {
                    "name": game.settings.get("ddb-importer", "entity-spell-compendium"),
                },
            };
            this.ddbcompendiums = {
                "magic-items": this.compendiums.Item,
                "monsters": this.compendiums.Actor,
                "spells": this.compendiums.Spell,
                "equipment": this.compendiums.Item
            };
        } else {
            this.compendiums = {};
            this.ddbcompendiums = {};
        }
    }

    // eslint-disable-next-line class-methods-use-this
    linkContent(html) {
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(html, 'text/html');
        for (const node of doc.querySelectorAll('a[data-ddbai-id]')) {
            let id = node.getAttribute("data-ddbai-id");
            let href = node.getAttribute("href");
            let type = node.getAttribute("data-ddbai-type");
            let entity = content.get(id, type);
            if (entity) {
                let refItem = "@" + type + "[" + entity.id + "]{" + node.textContent + "}";
                node.replaceWith(refItem);
            } else {
                if (this.linkFailed[type] === undefined) {
                    this.linkFailed[type] = {};
                }
                if (this.linkFailed[type][href] === undefined) {
                    this.linkFailed[type][href] = node.textContent;
                }
                logger.warn(type + " not found: " + node.href + " ID: " + id);
            }
        }
        return (doc.body.innerHTML);
    }

    updateEntry(entry, data) {
        let that = this;
        return entry.update(data).then(() => {
            that.step.step();
            return Promise.resolve();
        }, (err) => {
            logger.error("updateEntry error: " + err);
            that.step.step();
            return Promise.resolve();
        });
    }

    updateEmbedded(entry, attribute, data) {
        let that = this;
        return entry.updateEmbeddedEntity(attribute, data).then(() => {
            that.step.step();
            return Promise.resolve();
        }, (err) => {
            logger.error("updateEntry error: " + err);
            that.step.step();
            return Promise.resolve();
        });
    }
      
    linkJournalEntries() {
        const entries = content.MANAGED_ENTITIES["JournalEntry"].config.collection.filter((entry) => entry.data.flags.ddbai);
        let works = [];
        for (let e of entries) {
            let html = this.linkContent(e.data.content);
            works.push(this.updateEntry(e, { content: html }));
        }
        return Promise.all(works);
    }

    linkActors() {
        const entries = content.MANAGED_ENTITIES["Actor"].config.collection.filter((entry) => entry.data.flags.ddbai);
        let works = [];
        for (let e of entries) {
            let html = this.linkContent(e.data.data.details.biography.value);
            works.push(this.updateEntry(e, { 
                data: {
                    details: {
                        biography: {
                            value: html
                        }
                    }
                }
            }));
        }
        return Promise.all(works);
    }

    linkItems() {
        const entries = content.MANAGED_ENTITIES["Item"].config.collection.filter((entry) => entry.data.flags.ddbai);
        let works = [];
        for (let e of entries) {
            let html = this.linkContent(e.data.data.description.value);
            works.push(this.updateEntry(e, { 
                data: {
                    description: {
                        value: html
                    }
                }
            }));
        }
        return Promise.all(works);
    }

    linkRollTables() {
        const entries = content.MANAGED_ENTITIES["RollTable"].config.collection.filter((entry) => entry.data.flags.ddbai);
        let works = [];
        for (let e of entries) {
            let data = [];
            for (let r of e.data.results) {
                data.push({
                    _id: r._id,
                    text: this.linkContent(r.text)
                });
            }
            works.push(this.updateEmbedded(e, "TableResult", data));
        }
        return Promise.all(works);
    }

    async loadCompendiums () {
        for (let c in this.compendiums) {
            this.compendiums[c].compendium = game.packs.get(this.compendiums[c].name);
            // eslint-disable-next-line no-await-in-loop
            this.compendiums[c].index = await this.compendiums[c].compendium.getIndex();
        }
        this.fromCompendium = true;
    }

    contentSet (data, type, basesort) {
        let that = this;
        return content.set(data, type, basesort).then(() => {
            that.step.step();
            return Promise.resolve();
        }, (err) => {
            logger.error("content.set: " + err);
            that.step.step();
            return Promise.resolve();
        });
    }

    static getOrigin(entity) {
        let origin = {
            url: null,
            id: null
        };
        if (entity.data.flags.monsterMunch) {
            if (entity.data.flags.monsterMunch.url) {
                origin.url = entity.data.flags.monsterMunch.url;
            }
        } else if (entity.data.flags.ddbimporter) {
            origin.id = entity.data.flags.ddbimporter.definitionId;
        }
        return origin;
    }

    setEntitiesFromCompendium (node) {
        // Data need to be prepared; it's in the compendium
        let items = this.compendiums[node.type].index;
        let item = items.find((i) => normalizeName(i.name) === node.name);
        let that = this;
        if (item) {
            return this.compendiums[node.type].compendium.getEntity(item._id).then((entity) => {
                let origin = Importer.getOrigin(entity);
                if (origin.url == node.data.flags.ddbai.source || origin.id == node.data.flags.ddbai.ddbid) {
                    // 
                } else {
                    logger.warn(node.type + " " + node.name + " in compendium, but mismatch in source for id: " + entity._id + " source: " + node.data.flags.ddbai.source + " id: " + node.data.flags.ddbai.ddbid + " origin: " + JSON.stringify(origin));
                }
                let data = content.MANAGED_ENTITIES[node.type].config.collection.fromCompendium(entity.data);
                delete data._id;
                data.sort = node.data.sort;
                data.flags.ddbai = node.data.flags.ddbai;
                data.folder = node.data.folder;
                if (node.type == "Actor") { // Set the TOC
                    data.data.details.biography.value += node.data.data.details.biography.value;
                } else if (node.type == "Item") { // Set the TOC
                    data.data.description.value += node.data.data.description.value;
                }
                return that.contentSet(data, node.type);
            }, (err) => {
                logger.error(node.type + " " + node.name + " get entity failed: " + err);
                that.step.step();
                return Promise.resolve();
            });
        } else {
            logger.error(node.type + " " + node.name + " not found in compendium.");
            that.step.step();
            return Promise.resolve();
        }
    }

    async setEntities (node, promises) {
        for (let t in node.entities) {
            for (let e of node.entities[t]) {
                if (content.MANAGED_ENTITIES[e.type].fromCompendium) {
                    if (this.fromCompendium) {
                        promises.push(this.setEntitiesFromCompendium(e));
                    } else if (e.overloaded) {
                        promises.push(this.contentSet(e.data, e.type));
                    } else {
                        logger.warn(e.type + " " + e.data.name + " must be loaded from compendium.");
                        this.step.step(2); // we must take one additionnal step, because those entities will not be there in the link phase, and they are included in getLinkableEntitySize
                    }
                } else {
                    promises.push(this.contentSet(e.data, e.type));
                }
            }
        }
        for (let c of node.childrens) {
            this.setEntities(c, promises);
        }
    }

    async createEntities (root) {
        let promises = [];
        this.setEntities(root, promises);
        await Promise.all(promises);
    }

    async createFolders (node, type, basesort) {
        if (basesort === undefined) {
            basesort = {
                attribute: "sort",
                value: undefined
            };
        }
        if (type in node.data) {
            await this.contentSet(node.data[type], "Folder", basesort);
        }
        await Promise.all(node.childrens.map((c) => {
            return this.createFolders(c, type, basesort);
        }));
    }

    async process (step, fromCompendium) {
        let works = [];
        this.step = step;
        this.fromCompendium = fromCompendium;
        if (this.fromCompendium) {
            this.step.step("Loading compendiums...");
            await this.loadCompendiums();
        }
        this.step.step(5);
        this.step.step("Creating folders...");
        for (let t in content.MANAGED_ENTITIES) {
            works.push(this.createFolders(this.data, t));
        }
        await Promise.all(works);
        this.step.step("Creating entries...");
        await this.createEntities(this.data);
        this.step.step("Linking entries...");
        await this.linkJournalEntries();
        await this.linkRollTables();
        await this.linkActors();
        await this.linkItems();
        // await this.link();
        game.settings.set(
            "ddb-adventure-importer",
            "current-book",
            this.adventure
        );
        this.step.step("Importing done.");
        logger.info("Importing done.");
        return Promise.resolve();
    }

    getSize(node) {
        let n = Object.keys(node.data).length;
        for (let e in node.entities) {
            n += node.entities[e].length;
        }
        for (let c of node.childrens) {
            n += this.getSize(c);
        }
        return n;
    }

    getLinkableEntitySize(node) {
        let n = 0;
        if ("JournalEntry" in node.entities) {
            n += node.entities["JournalEntry"].length;
        }
        if ("RollTable" in node.entities) {
            n += node.entities["RollTable"].length;
        }
        if ("Actor" in node.entities) {
            n += node.entities["Actor"].length;
        }
        if ("Item" in node.entities) {
            n += node.entities["Item"].length;
        }
        for (let c of node.childrens) {
            n += this.getLinkableEntitySize(c);
        }
        return n;
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
        const url = utils.getAPIServer() + "/api/adventure/" + this.adventure + "/" + branch;
        let headers = new Headers();
        headers.append('Authorization', 'JWT ' + game.settings.get("ddb-adventure-importer", "patreon-key"));

        return fetch(url, { method: 'GET', headers: headers }).then(async (result) => {
            const status = result.status;
            if (status == 200) {
                logger.info('Response received, 200 OK');
                this.data = await result.json();
                return Promise.resolve(this.getSize(this.data) + this.getLinkableEntitySize(this.data) + 5);
            } else if (status == 401) {
                logger.error('401: Unauthorize access to the importer API');
                return Promise.reject({ message: "Unautorized: is your patreon token valid ?" });
            } else if (status == 500) {
                logger.error('500: Internal server error');
                let err = await result.json();
                return Promise.reject(err);
            } else {
                logger.error('Unknown server error: ' + status);
                return Promise.reject({ message: "Internal server error" });
            }
        }, (error) => {
            logger.error('REST GET request failed to importer API: ' + error.message);
            return Promise.reject(error);
        });
    }
};

import { logger } from "./logger.js";
import * as content from "./content.js";
import { getAPIServer } from "./utils.js";

const getExport = async (entity) => {
    const data = JSON.parse(JSON.stringify(entity._data));
    await content.unlink(entity, data);

    // Flag some metadata about where the entity was exported some - in case migration is needed later
    data.flags["exportSource"] = {
        world: game.world.id,
        system: game.system.id,
        coreVersion: game.data.version,
        systemVersion: game.system.data.version,
        ddbaiVersion: game.modules.get("ddb-adventure-importer").data.version
    };
    return data;
};

const uuidv4 = () => {
    // eslint-disable-next-line space-infix-ops
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c) =>
        // eslint-disable-next-line no-bitwise, no-mixed-operators
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
};

export const Exporter = class {

    constructor() {
        this.entities = {};
    }

    async addNode(e) {
        let json = e.exportToJSON();
        this.entities.push(json);
    }

    async bookScope(e, book) {
        if (e === null) {
            return null;
        } else if (e.data.flags.ddbai && e.data.flags.ddbai.book && e.data.flags.ddbai.book == book) {
            return e;
        } else {
            return this.bookScope(await content.getParent(e), book);
        }
    }

    checkScope(map) {
        for (let e of map.filter((f) => f.data.flags && f.data.flags.ddbai && f.data.flags.ddbai.origin == "mod")) {
            if (!this.bookScope(content.getParent(e), e.data.flags.ddbai.book)) {
                this.entities[content.getType(e)].rm.push(e.data.flags.ddbai.id);
                logger.info("Out of scope: " + content.getType(e) + " " + e.name + ": will be removed from repository.");
            }
        }
    }

    async flag(folder, book) {
        let untagged = folder.content.filter((c) => c.data.flags && c.data.flags.ddbai === undefined);
        for (let u of untagged) {
            let update = {
                flags: {
                    ddbai: {
                        book: book,
                        origin: "mod",
                        id: uuidv4()
                    },
                },
            };
            // eslint-disable-next-line no-await-in-loop
            await u.update(update);
            logger.info("New " + content.getType(u) + " found in folder " + folder.name + ": " + u.name);
        }
        for (let f of folder.children) {
            if (!("ddbai" in f.data.flags)) {
                let update = {
                    flags: {
                        ddbai: {
                            book: book,
                            origin: "mod",
                            id: uuidv4()
                        },
                    },
                };
                // eslint-disable-next-line no-await-in-loop
                await f.update(update);
                logger.info("New folder found in parent " + folder.name + ": " + f.name);
            }
            // eslint-disable-next-line no-await-in-loop
            await this.flag(f, (f.data.flags.ddbai && f.data.flags.ddbai.book) || book);
        }
    }

    async processExport(workspace, name, message, adventure, step) {
        this.step = step;
        this.step.step("Checking scope...");
        for (let m in content.MANAGED_ENTITIES) {
            this.checkScope(content.MANAGED_ENTITIES[m].config.collection); // Look for entities out of scope; they are no longer needed and will be purged from the repository.
        }
        this.step.step();
        this.step.step("Flagging entries....");
        for (let f of game.folders.filter((f) => f.parent === null && f.data.flags && f.data.flags.ddbai)) {
            // eslint-disable-next-line no-await-in-loop
            await this.flag(f, f.data.flags.ddbai.book); // Starting at the root, we flag all children
        }
        this.step.step();
        await this.export(workspace, name, message, adventure);
    }

    async export(workspace, name, message, adventure) {
        let hasExports = false;
        this.step.step("Preparing data...");
        for (let me in content.MANAGED_ENTITIES) {
            this.entities[me] = {
                rm: [],
                add: []
            };
            let c = content.MANAGED_ENTITIES[me].config.collection;
            for (let e of c.filter((f) => f.data.flags && f.data.flags.ddbai && f.data.flags.ddbai.origin == "mod" && !(this.entities[me].rm.includes(f.id)))) {
                // eslint-disable-next-line no-await-in-loop
                let ex = await getExport(e);
                this.entities[me].add.push(ex);
                hasExports = true;
                // logger.info("Added to export: " + e.name);
                // logger.info(json);
            }
        }
        this.step.step(5);
        if (hasExports) {
            this.step.step("Sending submission...");
            let data = {
                data: this.entities,
                author: {
                    name: name,
                    email: workspace,
                },
                message: message
            };
            let json = JSON.stringify(data);
            const url = getAPIServer() + "/api/submission/" + adventure + "/";
            let headers = new Headers();
            headers.append('Authorization', 'JWT ' + game.settings.get("ddb-adventure-importer", "patreon-key"));
            headers.append('Accept', 'application/json');
            headers.append('Content-Type', 'application/json');
            const rawResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: json
            });
            await rawResponse.json();
            this.step.step(10);
            this.step.step("Adventure saved in workspace.");
        } else {
            this.step.step(10);
            this.step.step("No data to export.");
        }
    }
};

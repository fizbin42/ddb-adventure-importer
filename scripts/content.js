import { logger } from "./logger.js";
import { save, uploadDDBAI } from "./utils.js";


export const MANAGED_ENTITIES = {};

// export const getBook = (entity) => {
//     return entity.data && entity.data.flags && entity.data.flags.ddbai && entity.data.flags.ddbai.book;
// };

export const loadTypes = () => {
    for (let t of [Scene, Actor, Item, Folder, JournalEntry, RollTable]) {
        MANAGED_ENTITIES[t.name] = {
            config: t.config,
            isFolder: false,
            fromCompendium: false, // These entities can be generated from compendium
            embeddedScope: {}, // Embedded entity can have relations
            relations: [],
            foundryContext: ["permission", "_id"], // These attributes are only needed within Foundry; they will be deleted at exportation 
            foundryContextEmbedded: {}, // These embedded attributes are only needed within Foundry; they will be deleted at exportation
            media: [],
        };
        for (let e in t.config.embeddedEntities) {
            MANAGED_ENTITIES[t.name].foundryContextEmbedded[e] = ["_id"];
        }
    }
    MANAGED_ENTITIES.Folder.isFolder = true;
    MANAGED_ENTITIES.Folder.relations = [{ type: "Folder", id: "parent" }];
    
    MANAGED_ENTITIES.JournalEntry.relations = [{ type: "Folder", id: "folder" }];

    MANAGED_ENTITIES.RollTable.relations = [{ type: "Folder", id: "folder" }];

    MANAGED_ENTITIES.Actor.relations = [{ type: "Folder", id: "folder" }];
    MANAGED_ENTITIES.Actor.fromCompendium = true;

    MANAGED_ENTITIES.Item.relations = [{ type: "Folder", id: "folder" }];
    MANAGED_ENTITIES.Item.fromCompendium = true;

    MANAGED_ENTITIES.Scene.relations = [{ type: "Folder", id: "folder" }, { type: "JournalEntry", id: "journal" }];
    MANAGED_ENTITIES.Scene.foundryContext.push('_priorThumbPath');
    MANAGED_ENTITIES.Scene.foundryContext.push('thumb');
    MANAGED_ENTITIES.Scene.embeddedScope.Note = { type: "JournalEntry", id: "entryId" };
    MANAGED_ENTITIES.Scene.media.push({ source: "src", target: "img" });
};

export const getType = (obj) => {
    let type = obj.constructor.name;
    if (type in MANAGED_ENTITIES) {
        return type;
    } else {
        type = Object.getPrototypeOf(obj.constructor).name;
        if (type in MANAGED_ENTITIES) {
            return type;
        } else {
            logger.error("Unknown entity type " + obj.constructor.name);
            return null;
        }
    }
};

export const get = (id, type, foundryID = false) => {
    let entity = MANAGED_ENTITIES[type].config.collection.find(
        (e) => 
            e.data.flags &&
            e.data.flags.ddbai &&
            e.data.flags.ddbai.id === id
    );
    if (entity === null && foundryID) {
        entity = MANAGED_ENTITIES[type].config.collection.find((e) => e._id === id);
    }
    return entity;
};

export const cleanUp = () => {
    let works = [];
    for (let f of game.folders.filter((f) => f.parent === null && f.data.flags && f.data.flags.ddbai)) {
        works.push(f.delete({ deleteSubfolders: true, deleteContents: true }));
    }
    return Promise.all(works);
};

const link = async(entity) => {
    let type = getType(entity);
    // let book = getBook(entity);
    if (!(type in MANAGED_ENTITIES)) {
        logger.error("Unknown entity type " + type);
    }
    for (let r of MANAGED_ENTITIES[type].relations) {
        let related = get(entity.data[r.id], r.type);
        if (related) {
            let update = {};
            update[r.id] = related._id;
            // eslint-disable-next-line no-await-in-loop
            await entity.update(update);
        }
    }
    for (let s in MANAGED_ENTITIES[type].embeddedScope) {
        let embedded = entity.getEmbeddedCollection(s).map((e) => { 
            let linked = get(e[MANAGED_ENTITIES[type].embeddedScope[s].id], MANAGED_ENTITIES[type].embeddedScope[s].type, true);
            if (linked) {
                let update = { _id: e._id };
                update[MANAGED_ENTITIES[type].embeddedScope[s].id] = linked.id;
                return update;
            } else {
                return undefined;
            }
        });
        // eslint-disable-next-line no-await-in-loop
        await entity.updateEmbeddedEntity(s, embedded);
    }
};

const prelink = (data, type) => {
    for (let r of MANAGED_ENTITIES[type].relations) {
        let related = get(data[r.id], r.type);
        if (related) {
            data[r.id] = related._id;
        }
    }
};

const delModOrigin = (content) => {
    const domparser = new DOMParser();
    let doc = domparser.parseFromString(content, 'text/html');
    let body = doc.body;
    for (const node of body.querySelectorAll('div[data-origin=ddbai]')) {
        node.parentNode.removeChild(node);
    }
    return (body.innerHTML);
};

// eslint-disable-next-line complexity
export const unlink = async (entity, data) => {
    let type = getType(entity);
    if (type == "Folder") { // rebase sort relative to root
        let parent = entity;
        while (parent.parent) {
            parent = parent.parent;
        }
        // Sort is already relative to the root folder ?
        // data.sort -= parent.data.sort; 
    }
    if (type == "JournalEntry") { // remove generated content
        data.content = delModOrigin(data.content);
    } else if (type == "Actor") { // remove generated content
        data.data.details.biography.value = delModOrigin(data.data.details.biography.value);
    } else if (type == "Item") { // remove generated content
        data.data.description.value = delModOrigin(data.data.description.value);
    }
    for (let r of MANAGED_ENTITIES[type].relations) {
        let related = entity[r.id];
        if (related) {
            data[r.id] = related.data.flags.ddbai && related.data.flags.ddbai.id;
        }
    }
    for (let s in MANAGED_ENTITIES[type].embeddedScope) {
        let attribute = MANAGED_ENTITIES[type].config.embeddedEntities[s];
        if (data[attribute]) {
            let tmp = [];
            let embeddedAttribute = MANAGED_ENTITIES[type].embeddedScope[s].id;
            let embeddedType = MANAGED_ENTITIES[type].embeddedScope[s].type;
            for (let m of data[attribute]) {
                let related = get(m[embeddedAttribute], embeddedType, true);
                if (related && related.data.flags.ddbai && related.data.flags.ddbai.id) {
                    m[embeddedAttribute] = related.data.flags.ddbai.id;
                    tmp.push(m);
                }
            }
            data[attribute] = tmp;
        }
    }
    for (let c of MANAGED_ENTITIES[type].foundryContext) {
        delete data[c];
    }
    for (let e in MANAGED_ENTITIES[type].config.embeddedEntities) {
        let attribute = MANAGED_ENTITIES[type].config.embeddedEntities[e];
        if (data[attribute]) {
            for (let m of data[attribute]) {
                for (let d of MANAGED_ENTITIES[type].foundryContextEmbedded[e]) {
                    delete m[d];
                }
            }
        }
    }
    for (let m of MANAGED_ENTITIES[type].media) { // We may have to upload new media
        let media = entity.data[m.target];
        let md5 = media.match(/[a-f0-9]{32}/);
        let newMedia = false;
        if (md5) {
            if (entity.data.flags.ddbai && entity.data.flags.ddbai.media && entity.data.flags.ddbai.media[m.target] && entity.data.flags.ddbai.media[m.target].id === md5[0]) {
                // logger.info("Old media in field " + m.target + " of " + etType(entity) + " " + entity.name);
            } else {
                logger.info("New media in field " + m.target + " of " + getType(entity) + " " + entity.name);
                newMedia = true;
            }
        } else {
            logger.info("New media in field " + m.target + " of " + getType(entity) + " " + entity.name);
            newMedia = true;
        }
        if (newMedia && entity.data.flags.ddbai && entity.data.flags.ddbai.media && entity.data.flags.ddbai.media[m.target] && entity.data.flags.ddbai.media[m.target].replaced == media) {
            logger.info("New media flagged replaced in field " + m.target + " of " + getType(entity) + " " + entity.name);
            newMedia = false;
        }
        if (newMedia) {
            // eslint-disable-next-line no-await-in-loop
            const f = await uploadDDBAI(media);
            data.flags.ddbai.media = {};
            data.flags.ddbai.media[m.target] = {
                id: f.id,
                url: f.get,
                replaced: entity.data[m.target]
            };
            // eslint-disable-next-line no-await-in-loop
            await entity.update({ flags: data.flags });
        }
        delete data.flags.ddbai.media[m.target]["replaced"];
        delete data[m.target];
    }
    data.id = entity.data.flags.ddbai.id;
};

export const linkAll = () => {
    let work = [];
    for (let type in MANAGED_ENTITIES) {
        for (let entity of MANAGED_ENTITIES[type].config.collection.filter((e) => e.data.flags.ddbai)) {
            work.push(link(entity));
        }
    }
    return Promise.all(work);
};

export const inScope = (entityType, embeddedType, embedded) => {
    if (embeddedType in MANAGED_ENTITIES[entityType].embeddedScope) {
        let entity = MANAGED_ENTITIES[MANAGED_ENTITIES[entityType].embeddedScope.embeddedType.type].config.collection.find((e) => {
            return e._id === embedded[MANAGED_ENTITIES[entityType].embeddedScope.embeddedType.id] && e.data.flags && e.data.flags.ddbai;
        });
        return (entity !== null);
    } else {
        return true;
    }
};

export const set = async (data, type, accumulator) => {
    prelink(data, type);
    let entity = get(data.flags.ddbai.id, type);
    if (entity) {
        // Managing media attibutes
        for (let m of MANAGED_ENTITIES[type].media) {
            if (entity.data.flags.ddbai.media[m.target].id != data.flags.ddbai.media[m.target].id) {
                // new media available
                const directory = game.settings.get("ddb-adventure-importer", "media-upload-directory");
                // eslint-disable-next-line no-await-in-loop
                const img = await save(data[m.source], directory);
                // eslint-disable-next-line require-atomic-updates
                data[m.target] = img.path;
            }
            delete data[m.source];
        }
        await entity.update(data);
        for (let et in MANAGED_ENTITIES[type].config.embeddedEntities) {
            // we delete the embedded entities before recreating them. 
            // eslint-disable-next-line no-await-in-loop
            await entity.deleteEmbeddedEntity(et, entity.getEmbeddedCollection(et).filter((e) => inScope(type, et, e)).map((e) => e._id));
            let attribute = MANAGED_ENTITIES[type].config.embeddedEntities[et];
            if (data[attribute] && data[attribute].length > 0) {
                // recreating the embedded entities. 
                // eslint-disable-next-line no-await-in-loop
                await entity.createEmbeddedEntity(et, data[attribute]);
            }
        }
        logger.debug("Updated " + type + " " + entity.name);
    } else {
        if (accumulator && accumulator.value) { // For folder sorting.
            data[accumulator.attribute] += accumulator.value;
        }
        // Managing media attibutes
        for (let m of MANAGED_ENTITIES[type].media) {
            const directory = game.settings.get("ddb-adventure-importer", "media-upload-directory");
            // eslint-disable-next-line no-await-in-loop
            const img = await save(data[m.source], directory);
            delete data[m.source];
            data[m.target] = img.path;
        }
        try {
            entity = await MANAGED_ENTITIES[type].config.baseEntity.create(data);
        } catch (err) {
            logger.error(err);
            logger.info(JSON.stringify(data, undefined, 2));
        }
        if (type === "Scene") {
            let thumb = await entity.createThumbnail();
            await entity.update({ thumb: thumb });
        }
        logger.debug("Created " + type + " " + entity.name);
        if (accumulator && accumulator.value === undefined) { // For folder sorting.
            accumulator.value = entity.data[accumulator.attribute];
        }
    }
    await link(entity, data);
    return entity;
};

export const getParent = (entity) => {
    return entity.folder || entity.parent;
};


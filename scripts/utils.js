import { logger } from "./logger.js";
import DirectoryPicker from "./lib/DirectoryPicker.js";

export var adventures = [];

const download = (url, filename) => {
    return new Promise((resolve, reject) => {
        try {
            let req = new XMLHttpRequest();
            req.open("GET", url);
            req.responseType = "blob";
            req.onerror = () => reject("Network error");
            req.onload = () => {
                if (req.status === 200) {
                    let disposition = req.getResponseHeader("Content-Disposition");
                    let height = req.getResponseHeader("x-image-height");
                    let width = req.getResponseHeader("x-image-width");
                    let id = req.getResponseHeader("x-id");
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        var matches = filenameRegex.exec(disposition);
                        if (matches !== null && matches[1]) { 
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }
                    resolve({ data: req.response, filename: filename, width: width, height: height, id: id });
                } else reject("Loading error: " + req.statusText);
            };
            req.send();
        } catch (error) {
            logger.error(error);
            logger.error(error.stack);
            reject(error.message);
        }
    });
};

const upload = (data, filename, directory) => {
    const file = new File([data], filename, { type: data.type });
    return DirectoryPicker.uploadToPath(directory, file);
};

export function validEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

export function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
  }

export const getAPIServer = () => {
    const environment = game.settings.get("ddb-adventure-importer", "environment");
    if (environment == "production") {
        return "https://ddbai.fizbin.ca";
    } else {
        return "http://127.0.0.1:3000";
    }
};

export const moduleActive = (moduleName) => {
    return game.modules.has(moduleName) && game.modules.get(moduleName).active;
};

export const getCobaltCookie = () => {
    return game.settings.get("ddb-adventure-importer", "cobalt-cookie") || game.settings.get("ddb-importer", "cobalt-cookie");
};

export const ready = () => {
    return getCobaltCookie() && game.settings.get("ddb-adventure-importer", "patreon-key");
};

export const loadAdventures = () => {
    let url = getAPIServer() + "/api/adventure";

    fetch(url).then(async (response) => {
        adventures = await response.json();
        logger.info(adventures.length + " adventures availables");
    }, (error) => {
        adventures = [];
        logger.error(error);
    });
};

export const uploadDDBAI = (src) => {
    return fetch(src).then((response) => {
        return response.blob();
    }).then((content) => {
        const formData = new FormData();
        formData.append("media", content);
        let f = src.split('/').pop();
        let url = getAPIServer() + "/proxy/upload/" + f;
        let headers = new Headers();
        headers.append('Authorization', 'JWT ' + game.settings.get("ddb-adventure-importer", "patreon-key"));
        return fetch(url, { method: 'POST', body: formData, headers: headers });
    }).then((response) => {
        return response.json();
    });
};

export const save = (url, directory) => {
    let filename = url.split('/').pop();
    return download(url, filename).then(async (result) => {
        let upl = await upload(result.data, result.filename, directory);
        upl.width = result.width;
        upl.height = result.height;
        return upl;
    });
};


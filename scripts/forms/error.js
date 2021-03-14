// eslint-disable-next-line no-unused-vars
import { logger } from "../logger.js";

export class DDBAIError extends Application {

    constructor(options, error) {
        super(options);
        this.error = error;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "ddb-importer-adventure-error";
        options.template = "modules/ddb-adventure-importer/handlebars/error.handlebars";
        options.resizable = false;
        options.height = 600;
        options.width = 600;
        options.title = "Error - DDB Adventure Importer";
        return options;
    }
  
    getData() { // eslint-disable-line class-methods-use-this
        return {
            error: this.error
        };
    }
}

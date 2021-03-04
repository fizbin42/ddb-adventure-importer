// eslint-disable-next-line no-unused-vars
import { logger } from "../logger.js";
import { adventures, ready } from "../utils.js";
import { Importer } from "../importer.js";
import { Exporter } from "../exporter.js";

export class ImportExport extends Application {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "ddb-importer-adventure";
        options.template = "modules/ddb-adventure-importer/handlebars/adventure.handlebars";
        options.resizable = false;
        options.height = "auto";
        options.width = 600;
        options.title = "DDB Adventure Importer";
        options.classes = ["sheet"];
        options.tabs = [{ navSelector: ".tabs", contentSelector: "form", initial: "import" }];
        return options;
    }
  
    activateListeners(html) {
        super.activateListeners(html);
        html.find("#import-adventure-start").click(async () => {
            ImportExport.disableButtons();
            this.importAdventure();
        });
        html.find("#export-adventure-start").click(async () => {
            ImportExport.disableButtons();
            this.exportAdventure();
        });
        html.find('#ddbai-workspace').on("change", (event) => {
            game.settings.set(
                "ddb-adventure-importer",
                "submission-workspace",
                event.currentTarget.value
            );
        });
        html.find('#ddbai-submission-email').on("change", (event) => {
            game.settings.set(
                "ddb-adventure-importer",
                "submission-workspace",
                event.currentTarget.value
            );
        });
        html.find('#ddbai-submission-name').on("change", (event) => {
            game.settings.set(
                "ddb-adventure-importer",
                "submission-name",
                event.currentTarget.value
            );
        });
        this.close();
    }
  
    static enableButtons() {
        if (ready()) {
            $('button[id^="import-adventure-"]').prop('disabled', false);
            $('button[id^="export-adventure-"]').prop('disabled', false);
        } else {
            $('button[id^="import-adventure-"]').prop('disabled', true);
            $('button[id^="export-adventure-"]').prop('disabled', true);
        }
    }

    static disableButtons() {
        $('button[id^="import-adventure-"]').prop('disabled', true);
        $('button[id^="export-adventure-"]').prop('disabled', true);
    }

    step(label) {
        if (label === undefined || Number.isInteger(label)) {
            let s = 1;
            if (label) {
                s = label;
            }
            this.milestone += s;
            if (this.milestone > this.size) {
                this.milestone = this.size;
            }
            $('#import-progress-bar').css('width', Math.round(100.0 * this.milestone / this.size) + "%");
        } else {
            $('#import-progress-title').text(label);
        }
    }
  
    async importAdventure() {
        const imported = new Importer();
        this.milestone = -1;
        this.size = 1;
        this.step();
        this.step("Loading data from D&DBeyond...");
        this.size = await imported.load($('#ddbai-adventure-id').val(), $('#ddbai-workspace').val());
        if (this.size > 0) {
            imported.process(this);
        } else {
            this.step("Importation error");
        }
        ImportExport.enableButtons();
    }

    async exportAdventure() {
        const exporter = new Exporter();
        this.milestone = -1;
        this.size = 17;
        this.step();
        await exporter.processExport($('#ddbai-submission-email').val(), $('#ddbai-submission-name').val(), $('#ddbai-submission-message').val(), game.settings.get("ddb-adventure-importer", "current-book"), this);
        ImportExport.enableButtons();
    }
  
    getData() { // eslint-disable-line class-methods-use-this
        return {
            ready: ready(),
            adventures: adventures,
            workspace: game.settings.get("ddb-adventure-importer", "submission-workspace"),
            name: game.settings.get("ddb-adventure-importer", "submission-name")
        };
    }
}

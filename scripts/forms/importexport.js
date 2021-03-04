import { logger } from "../logger.js";
import { adventures, save, getAPIServer, ready } from "../utils.js";
import { Importer } from "../importer.js";
import { Exporter } from "../Exporter.js";

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
            ImportExport.importAdventure();
        });
        html.find("#export-adventure-start").click(async () => {
            ImportExport.disableButtons();
            ImportExport.exportAdventure();
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

    static dummy() {
        const url = getAPIServer() + "/api/redeem/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3JhbnRlZSIsImhyZWYiOiJodHRwczovL21lZGlhLXdhdGVyZGVlcC5jdXJzZWNkbi5jb20vYXR0YWNobWVudHMvNS8zNzkvMDEtcGMucG5nIiwiaWF0IjoxNjEyNDA2NDQzLCJleHAiOjE2MTI0MTI0NDN9.V76QN9sgRZ7DcUxE9QeEoNwflNMl9rbqkqKYl2sm40o/01-pc.png";
        return save(url, "[data] test");
    }
  
    static async importAdventure() {
        const imported = new Importer();
        await imported.load($('#ddbai-adventure-id').val(), $('#ddbai-workspace').val());
        ImportExport.enableButtons();
    }

    static async exportAdventure() {
        const exporter = new Exporter();
        await exporter.processExport($('#ddbai-submission-email').val(), $('#ddbai-submission-name').val(), $('#ddbai-submission-message').val(), game.settings.get("ddb-adventure-importer", "current-book"));
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

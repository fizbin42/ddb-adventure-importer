import DirectoryPicker from "../../lib/DirectoryPicker.js";
import DDBAISetup from "../../forms/setup.js";

export default function () {
    game.settings.registerMenu("ddb-adventure-importer", 'setupMenu', {
        name: "ddb-adventure-importer.setup.name",
        label: "ddb-adventure-importer.setup.name",
        hint: "ddb-adventure-importer.setup.hint",
        icon: 'fas fa-wrench',
        type: DDBAISetup,
        restricted: true
    });


    game.settings.register("ddb-adventure-importer", "media-upload-directory", {
        name: "ddb-adventure-importer.media-upload-directory.name",
        hint: "ddb-adventure-importer.media-upload-directory.hint",
        scope: "world",
        config: false,
        type: DirectoryPicker.Directory,
        default: "[data] ",
    });
    
    game.settings.register("ddb-adventure-importer", "cobalt-cookie", {
        name: "ddb-adventure-importer.cobalt-cookie.name",
        hint: "ddb-adventure-importer.cobalt-cookie.hint",
        scope: "world",
        config: false,
        type: String,
        default: "",
    });

    game.settings.register("ddb-adventure-importer", "patreon-key", {
        name: "ddb-adventure-importer.patreon-key.name",
        hint: "ddb-adventure-importer.patreon-key.hint",
        scope: "world",
        config: false,
        type: String,
        default: "",
    });

    game.settings.register("ddb-adventure-importer", "submission-name", {
        name: "Name",
        hint: "",
        scope: "world",
        config: false,
        type: String,
        default: "",
    });

    game.settings.register("ddb-adventure-importer", "current-book", {
        name: "Current book",
        hint: "",
        scope: "world",
        config: false,
        type: String,
        default: "",
    });

    game.settings.register("ddb-adventure-importer", "submission-workspace", {
        name: "Workspace",
        hint: "",
        scope: "world",
        config: false,
        type: String,
        default: "",
    });

    game.settings.register("ddb-adventure-importer", "log-level", {
        name: "Log level",
        hint: "Log level for the module. The logs are printed in the browser javascript console.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "VERBOSE": "VERBOSE",
            "DEBUG": "DEBUG",
            "INFO": "INFO",
            "WARN": "WARN",
            "ERR": "ERROR",
            "FATAL": "FATAL",
            "OFF": "OFF"
        },
        default: "INFO"
      });

      game.settings.register("ddb-adventure-importer", "environment", {
        name: "Environment",
        hint: "Leave at 'production' unless you know what you're doing.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "production": "production",
            "development": "development"
        },
        default: "production"
      });
}

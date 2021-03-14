const BAD_DIRS = ["[data]", "[data] ", "", null];
import DirectoryPicker from "../lib/DirectoryPicker.js";

Hooks.on("renderDDBAISetup", (app, html) => {
    DirectoryPicker.processHtml(html);
});

// eslint-disable-next-line no-undef
class DDBAISetup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "ddb-adventure-importer-settings";
        options.template = "modules/ddb-adventure-importer/handlebars/settings.handlebars";
        options.width = 500;
        return options;
    }
  
    get title() { // eslint-disable-line class-methods-use-this
      // improve localisation
      // game.i18n.localize("")
      return "DDB Adventure Importer Settings";
    }
  
    /** @override */
    async getData() { // eslint-disable-line class-methods-use-this
      const cobalt = game.settings.get("ddb-adventure-importer", "cobalt-cookie") != "";
      const patreonKey = game.settings.get("ddb-adventure-importer", "patreon-key") != "";
      const uploadDir = game.settings.get("ddb-adventure-importer", "media-upload-directory");
      const dataDirSet = !BAD_DIRS.includes(uploadDir);
  
      const setupConfig = {
        "media-upload-directory": uploadDir,
        "cobalt-cookie": game.settings.get("ddb-adventure-importer", "cobalt-cookie"),
        "patreon-key": game.settings.get("ddb-adventure-importer", "patreon-key")
      };
  
      const setupComplete = dataDirSet && cobalt && patreonKey;
  
      return {
        cobalt: cobalt,
        setupConfig: setupConfig,
        setupComplete: setupComplete
      };
    }
  
    /** @override */
    // eslint-disable-next-line no-unused-vars
    async _updateObject(event, formData) { // eslint-disable-line class-methods-use-this
      event.preventDefault();
      const mediaDir = formData['media-upload-directory'];
      const patreonKey = formData['patreon-key'];
      let cobaltCookie = formData['cobalt-cookie'];
      await game.settings.set("ddb-adventure-importer", "media-upload-directory", mediaDir);
      await game.settings.set("ddb-adventure-importer", "cobalt-cookie", cobaltCookie);
      await game.settings.set("ddb-adventure-importer", "patreon-key", patreonKey);
      cobaltCookie = cobaltCookie || game.settings.get("ddb-importer", "cobalt-cookie");
      const mediaDirSet = !BAD_DIRS.includes(mediaDir);
  
      if (!mediaDirSet) {
        $('#ddbai-task-setup').text(`Please set the media upload directory to something other than the root.`);
        $('#ddb-adventure-importer-settings').css("height", "auto");
        throw new Error(`Please set the media upload directory to something other than the root.`);
      } else if (cobaltCookie === "") {
        $('#ddbai-task-setup').text(`To import from D&D Beyond, you need to set a Cobalt Cookie value!`);
        $('#ddb-adventure-importer-settings').css("height", "auto");
        throw new Error(`To import from D&D Beyond, you need to set a Cobalt Cookie value!`);
      } else if (patreonKey === "") {
        $('#ddbai-task-setup').text(`To import from D&D Beyond, you need to set a Patreon key!`);
        $('#ddb-adventure-importer-settings').css("height", "auto");
        throw new Error(`To import from D&D Beyond, you need to set a Patreon key!`);
      }
    }
}

export default DDBAISetup;

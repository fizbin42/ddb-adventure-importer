// eslint-disable-next-line no-unused-vars
import { logger } from "../logger.js";
import * as utils from "../utils.js";

export class FeaturePack extends FormApplication {

    constructor(options, feature) {
        super(options);
        this.feature = feature;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "ddb-importer-feature-pack";
        options.template = "modules/ddb-adventure-importer/handlebars/featurepack.handlebars";
        options.resizable = false;
        options.height = 800;
        options.width = 800;
        options.title = "Feature Pack";
        return options;
    }

    /**
   * Fired whenever any of TinyMCE editors is saved.
   * Just pass data to object's property, we handle save in one go after submit
   *
   * @see _updateObject()
   *
   * @param target
   * @param element
   * @param content
   * @returns {Promise<void>}
   * @private
   */
    async _onEditorSave(target, element, content) {
        this[target] = content;

        // keep function to override parent function
        // we don't need to submit form on editor save
    }

    /**
     * Called "on submit". Handles saving Form's data
     *
     * @param event
     * @param formData
     * @private
     */
    // eslint-disable-next-line class-methods-use-this
    async _updateObject(event, formData) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(formData));
    }

    activateListeners(html) {
        super.activateListeners(html);
        const mandatoryFields = ["name", "secret", "creatorname"];
        html.find("#ddbai-feature-save").click(() => {
            let ok = true;
            if (!utils.validEmail($("#ddbai-feature-creatoremail").val())) {
                $("#ddbai-feature-creatoremail-error").text("Invalid email; please enter a correct value.");
                ok = false;
            } else {
                $("#ddbai-feature-creatoremail-error").text("");
            }
            if (!utils.validURL($("#ddbai-feature-url").val())) {
                $("#ddbai-feature-url-error").text("Invalid URL; please enter a correct value.");
                ok = false;
            } else {
                $("#ddbai-feature-url-error").text("");
            }
            for (let v of mandatoryFields) {
                let field = "#ddbai-feature-" + v;
                let fieldError = "#ddbai-feature-" + v + "-error";
                if ($(field).val() === undefined || $(field).val().length == 0) {
                    $(fieldError).text("This field is mandatory; please enter a value.");
                    ok = false;
                } else {
                    $(fieldError).text("");
                }
            }
            return ok;
        });
    }
  
    getData() { // eslint-disable-line class-methods-use-this
        return {
            feature: this.feature
        };
    }
}

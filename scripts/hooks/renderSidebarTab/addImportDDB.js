import { ImportExport } from "../../forms/importexport.js";
export default function (app, html) {
    if (app.options.id == "settings" && game.user.isGM) {
      let header = $("<h2>D&DBeyond</h2>");
      let button = $("<button class='ddb-adventure'><i class='fas fa-file-import'></i>Adventure import/export</button>");
  
      button.click(async () => {
          new ImportExport().render(true);
      });
  
      $(html).find("div#settings-game").append(header).append(button);
    }
}

function narrate(html) {
    // eslint-disable-next-line no-undef
    if (!game.user.isGM || (NarratorTools === undefined)) return;

    $(html)
      .find('aside.read-aloud-text')
      .each((index, element) => {
        const showNarrateButton = $("<a class='ddbai-narrate-button'><i class='fas fa-comment-dots'></i></a>");
        const anchor = $(element).find("p:last") || element;
        $(element)
          .mouseenter(() => {
            $(anchor).append(showNarrateButton);
            $(showNarrateButton).click(() => {
              const text = $(element).text();
              // eslint-disable-next-line no-undef
              NarratorTools.chatMessage.narrate(text);
            });
          });
        $(element)
          .mouseleave(() => {
            $(element).find("a.ddbai-narrate-button").remove();
          });
      });
  }
  
  export default narrate;

export function convertTranslationToHTML(textsJson) {
  if (!textsJson || !textsJson.translation_elements) return "error!";

  let result = "";

  // Iterate through each HTML fragment in the translation_elements array
  textsJson.translation_elements.forEach((element) => {
    let contentStr = "";

    // Determine if content is an array (for list items) or a string
    if (Array.isArray(element.content)) {
      // For list type, join each list item (assumed to be complete <li>...</li> strings)
      contentStr = element.content.join("\n");
    } else {
      contentStr = element.content;
    }

    // Build the complete HTML fragment from the element and add it to result
    result += `${element.opening_html_tag}${contentStr}${element.closing_html_tag}\n`;
  });

  // console.log(result);

  return result.trim();
}
  
export const SAMPLE_START = '//sampleStart';
export const SAMPLE_END = '//sampleEnd';

export const MARK_PLACEHOLDER_OPEN = "[mark]";
export const MARK_PLACEHOLDER_CLOSE = "[/mark]";


/**
 * Use instead of @escape-string-regexp
 */

export /*#__PURE__*/ function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Unescape special characters from string
 * @param string
 * @returns {string}
 */
export /*#__PURE__*/ function unEscapeString(string) {
  const tagsToReplace = {
    "<": "&amp;lt;",
    ">": "&amp;gt;",
    "&": "&amp;",
    " ": "%20"
  };
  let unEscapedString = string;
  Object.keys(tagsToReplace).forEach(function (key) {
    unEscapedString = unEscapedString.replace(new RegExp(tagsToReplace[key], 'g'), key)
  });
  return unEscapedString
}

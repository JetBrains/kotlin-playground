import merge from 'deepmerge';
import convertCase from 'to-case';
import defaultConfig from './config';

/**
 * @param {*} arrayLike
 * @return {Array}
 */
export function arrayFrom(arrayLike) {
  return Array.prototype.slice.call(arrayLike, 0);
}

/**
 * @param {Element} element
 * @param {boolean} mergeWithDefaults
 * @return {Object<string, string>}
 */
export function getConfigFromElement(element, mergeWithDefaults = false) {
  if (!element.attributes) {
    return {};
  }

  const attrs = arrayFrom(element.attributes)
    .map((attr) => {
      return {name: attr.name, value: attr.value}
    })
    .filter(option => option.name.indexOf('data-') !== -1)
    .reduce((acc, attr) => {
      const name = convertCase.camel(attr.name.replace('data-', ''));
      acc[name] = attr.value;
      return acc;
    }, {});

  return mergeWithDefaults
    ? merge.all([defaultConfig, attrs || {}])
    : attrs;
}

/**
 * @return {HTMLScriptElement|null}
 */
export function getCurrentScript() {
  const scripts = document.getElementsByTagName('script');
  return scripts[scripts.length - 1] || null;
}

/**
 * @return {boolean}
 */
export function isEmbeddedFromCdn() {
  const currentScript = getCurrentScript();
  const src = currentScript.src ? currentScript.src : null;
  return src && src.indexOf(__CDN_URL__) !== -1;
}

/**
 * @param {Element} newNode
 * @param {Element} referenceNode
 */
export function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

export function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Unescape special characters from string
 * @param string
 * @returns {string}
 */
export function unEscapeString(string) {
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

/**
 * convert all `<` and `>` to `&lt;` and `&gt;`
 * @param string
 * @returns {*}
 */
export function convertToHtmlTag(string) {
  const tagsToReplace = {
    "&lt;": "&amp;lt;",
    "&gt;": "&amp;gt;",
  };
  let unEscapedString = string;
  Object.keys(tagsToReplace).forEach(function (key) {
    unEscapedString = unEscapedString.replace(new RegExp(tagsToReplace[key], 'g'), key)
  });
  return unEscapedString
}

/**
 * Getting count of lines
 * @param string
 * @returns {number}
 */
export function countLines(string) {
  return (string.match(/\n/g) || []).length;
}

/**
 * @param {string} selector
 * @param {Function<Node>} callback
 */
export function waitForNode(selector, callback) {
  const interval = setInterval(() => {
    const node = document.querySelector(selector);
    if (node) {
      clearInterval(interval);
      callback(node);
    }
  }, 100);
}

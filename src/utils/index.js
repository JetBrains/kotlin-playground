import merge from 'deepmerge';
import defaultConfig from '../config';

/**
 * Codemirror themes.
 * @type {{DARCULA: string, DEFAULT: string}}
 */
export const THEMES = {
  DARCULA: "darcula",
  IDEA: "idea",
  DEFAULT: "default"
};

export const SAMPLE_START = '//sampleStart';
export const SAMPLE_END = '//sampleEnd';

export const MARK_PLACEHOLDER_OPEN = "[mark]";
export const MARK_PLACEHOLDER_CLOSE = "[/mark]";

/**
 * CodeMirror readonly tag
 * @type {string}
 */
export const READ_ONLY_TAG = 'nocursor';

/**
 * @param {*} arrayLike
 * @return {Array}
 */
export function arrayFrom(arrayLike) {
  return Array.prototype.slice.call(arrayLike, 0);
}

/**
 * Convert first letter of string in upper case`
 * @param string
 * @returns {string}
 */
export function capitalize(string) {
  if (typeof string !== 'string') return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Convert dashed string to camelCase`
 * @param string
 * @returns {string}
 */
export function dashToCamel(string) {
  return string
    .split('-')
    .map((el, i) => {
      if (!i) return el;
      return capitalize(el);
    })
    .join('');
}

/**
 * @param {Element} element
 * @param {boolean} mergeWithDefaults
 * @return {Object<string, string>}
 */
export function getConfigFromElement(element, mergeWithDefaults = false) {
  if (!element || !element.attributes) {
    return {};
  }

  const attrs = arrayFrom(element.attributes)
    .reduce((acc, {name, value}) => {
      if (name.indexOf('data-') === -1) return acc;

      const className = dashToCamel(name.replace('data-', ''));
      acc[className] = value;
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
 * @param {Element} newNode
 * @param {Element} referenceNode
 */
export function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * Convert all `<` and `>` to `&lt;` and `&gt;`
 * @param string
 * @returns {*}
 */
export function processingHtmlBrackets(string) {
  const tagsToReplace = {
    "&lt;": "<",
    "&gt;": ">"
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
 * Find and replace whitespaces from either the beginning or the end of the string.
 * @param string
 * @returns {string}
 */
export function replaceWhiteSpaces(string) {
  return string.replace(/^\s+|\s+$/g, '');
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

/**
 * Check that string consists only of blanks.
 * @param line
 * @returns {boolean}
 */
export function isEmpty(line) {
  return /^\s*$/.test(line);
}

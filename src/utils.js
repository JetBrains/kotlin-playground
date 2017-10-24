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
      return { name: attr.name, value: attr.value }
    })
    .filter(option => option.name.indexOf('data-') !== -1)
    .reduce((acc, attr) => {
      const name = convertCase.camel(attr.name.replace('data-', ''));
      acc[name] = attr.value;
      return acc;
    }, {});

  return mergeWithDefaults
    ? merge.all([ defaultConfig, attrs || {} ])
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

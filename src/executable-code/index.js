import ExecutableFragment from './executable-fragment';

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {string} compilerVersion
   */
  constructor(target, compilerVersion)   {
    const node = typeof target === 'string' ? document.querySelector(target) : target;
    const code = node.textContent;

    const executableFragmentContainer = document.createElement('div');
    node.parentNode.replaceChild(executableFragmentContainer, node);
    const view = ExecutableFragment.render(executableFragmentContainer);

    view.update({
      code: code,
      compilerVersion: compilerVersion
    });
  }
}

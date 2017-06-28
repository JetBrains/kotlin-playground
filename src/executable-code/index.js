import ExecutableFragment from './executable-fragment';
import WebDemoApi from './webdemo-api';

export default function ExecutableCode(nodesOrSelector) {
  WebDemoApi.getCompilerConfigs().then(compilerConfigs => {
    document.querySelectorAll(nodesOrSelector)
      .forEach((element) => {
        const code = element.querySelectorAll('code')[0].textContent;
        const executableFragmentContainer = document.createElement('div');
        element.parentNode.replaceChild(executableFragmentContainer, element);
        const minCompilerVersion = element.getAttribute('data-min-compiler-version');

        const view = ExecutableFragment.render(executableFragmentContainer);
        let latestStableVersion;
        compilerConfigs.forEach(compilerConfig => {
          if (compilerConfig.latestStable) {
            latestStableVersion = compilerConfig.version;
          }
        });

        let compilerVersion;
        if (minCompilerVersion) {
          compilerVersion = minCompilerVersion > latestStableVersion ?
            compilerConfigs[compilerConfigs.length - 1].version :
            latestStableVersion;
        } else {
          compilerVersion = latestStableVersion;
        }

        view.update({
          code: code,
          compilerVersion: compilerVersion
        });
      });
  });
};

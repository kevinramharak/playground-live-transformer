import type { PlaygroundPlugin, PluginUtils } from "../../vendor/playground";
import readme from './readme.md';
import template from './transformer.ts.tpl';

interface IPluginData {

}

export function createReadme(utils: PluginUtils): PlaygroundPlugin {
    const data: IPluginData = {}
    const $readme = document.createElement('div');
    $readme.innerHTML = readme.html;

    return {
        id: 'readme',
        displayName: 'Readme',
        data,
        willMount(sandbox, container) {
            const ds = utils.createDesignSystem(container);
            const $button = ds.button({
                label: 'Replace the editor contents with a template',
                onclick() {
                    // TODO: use sandbox.editor.getModel() and its user friendly api so undo is possible
                    sandbox.setText(template);
                }
            });
            $button.style.marginBottom = '16px';
            ds.container.appendChild($readme);
        },
    };
}

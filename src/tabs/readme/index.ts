import ts from "typescript";
import { createButton, createMarkdownContainer } from "../../util/html";
import type { PlaygroundPlugin, PluginUtils } from "../../vendor/playground";
import readme from './readme.md';
import template from './transformer.ts.tpl';

export function createReadme(utils: PluginUtils): PlaygroundPlugin {
    return {
        id: 'readme',
        displayName: 'Readme',
        willMount(sandbox, container) {
            const ds = utils.createDesignSystem(container);
            const $readme = createMarkdownContainer(readme.html, {
                'insert-template-button': createButton('Get started with a transformer template', {
                    click: () => sandbox.setText(template),
                }),
            });
            ds.container.appendChild($readme);
        },
    };
}

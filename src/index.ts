import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground"

import { tabs as tabFactories } from './tabs';

export default function makePlugin(utils: PluginUtils): PlaygroundPlugin {
    const tabs = tabFactories.map(entry => entry(utils));

    const data = {
        tabs,
        active: tabs[0],
        tabContainer: document.createElement('div'),
    };

    const id = 'playground-live-transformer';
    const getTabId = (tabId: string) => `playground-plugin-tab-${id}-${tabId}`;

    return {
        id,
        displayName: 'Live Transformer',
        willMount: (sandbox, container) => {
            // based on https://github.com/microsoft/TypeScript-website/blob/v2/packages/typescriptlang-org/src/components/workbench/plugins/docs.ts#L247
            const ds = utils.createDesignSystem(container);
            const $bar = ds.createTabBar();
            const $tabs: HTMLElement[] = [];

            tabs.forEach(entry => {
                const $tab = ds.createTabButton(entry.displayName);
                $tab.id = getTabId(entry.id);
                $tabs.push($tab);
                $tab.onclick = () => {  
                    const ds = utils.createDesignSystem(data.tabContainer);
                    
                    if (data.active.willUnmount) {
                        data.active.willUnmount(sandbox, data.tabContainer);
                    }
                    
                    ds.clear();
                    $tabs.forEach($tab => $tab.classList.remove('active'));

                    if (data.active.didUnmount) {
                        data.active.didUnmount(sandbox, data.tabContainer);
                    }

                    if (entry.willMount) {
                        entry.willMount(sandbox, data.tabContainer);
                    }

                    $tab.classList.add('active');
                    data.active = entry;
                    
                    if (data.active.didMount) {
                        data.active.didMount(sandbox, data.tabContainer);
                    }
                };

                $bar.appendChild($tab);
            });
            
            container.appendChild($bar);
            container.appendChild(data.tabContainer);

            if (data.active) {
                if (data.active.willMount) {
                    data.active.willMount(sandbox, data.tabContainer);
                }
                const activeTab = document.querySelector(`#${getTabId(data.active.id)}`);
                if (activeTab) {
                    activeTab.classList.add('active');
                }
                if (data.active.didMount) {
                    data.active.didMount(sandbox, data.tabContainer);
                }
            }
        },
        didMount: (sandbox, container) => {
            if (data.active.didMount) {
                data.active.didMount(sandbox, data.tabContainer);
            }
        },
        willUnmount: (sandbox, container) => {
            container.removeChild(data.tabContainer);
            if (data.active.willUnmount) {
                data.active.willUnmount(sandbox, data.tabContainer);
            }
        },
        didUnmount: (sandbox, container) => {
            if (data.active.didUnmount) {
                data.active.didUnmount(sandbox, data.tabContainer);
            }
        },
        modelChangedDebounce(sandbox, model, container) {
            if (data.active.modelChangedDebounce) {
                data.active.modelChangedDebounce(sandbox, model, data.tabContainer);
            }
        },
    };
}

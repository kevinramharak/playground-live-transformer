import type { PlaygroundPlugin, PluginUtils } from "../vendor/playground"
import type { Sandbox } from "../vendor/sandbox";

type PluginFactory = (utils: PluginUtils) => PlaygroundPlugin;
type Methods<T> = { [P in keyof T as T[P] extends Function | undefined ? P : never]: T[P] };
type PluginHooks = Omit<Methods<PlaygroundPlugin>, 'data'>;

/**
 * Boilerplate to re-create the normal tab interface from the playground
 * based on https://github.com/microsoft/TypeScript-Website/blob/v2/packages/playground/src/
 */
export function createTabManager(plugins: PluginFactory[], config: { namespace: string, utils: PluginUtils }): PluginHooks {
    const { namespace, utils } = config;
    const patchId = (id: string) => `${namespace}-${id}`;
    
    const tabs = plugins.map(factory => {
        const plugin = factory(utils);
        return plugin;
    });

    const $container = document.createElement('div');
    let active: PlaygroundPlugin | undefined;

    const activateTab = (newTab: PlaygroundPlugin, oldTab: PlaygroundPlugin | undefined, sandbox: Sandbox, $container: HTMLDivElement, $bar: HTMLDivElement) => {
        const $$tabs = Array.from($bar.children) as HTMLElement[];
        const oldTabButton = oldTab ? $$tabs.find(el => el.id === patchId(oldTab!.id)) : void 0;
        const newTabButton = $$tabs.find(el => el.id === patchId(newTab.id))!;

        if (oldTab && oldTabButton) {
            if (oldTab.willUnmount) {
                oldTab.willUnmount(sandbox, $container);
            }
            oldTabButton.classList.remove("active")
            oldTabButton.setAttribute("aria-selected", "false")
            oldTabButton.setAttribute("tabindex", "-1")
        }

        // Wipe the sidebar
        while ($container.firstChild) {
            $container.removeChild($container.firstChild)
        }

        // Start booting up the new plugin
        newTabButton.classList.add("active")
        newTabButton.setAttribute("aria-selected", "true")
        newTabButton.setAttribute("tabindex", "0")

        // Tell the new plugin to start doing some work
        if (newTab.willMount) newTab.willMount(sandbox, $container)

        // TODO: maybe make these async? (as in Promise.resolve().then() stuff)
        if (newTab.modelChanged) newTab.modelChanged(sandbox, sandbox.getModel(), $container)
        if (newTab.modelChangedDebounce) newTab.modelChangedDebounce(sandbox, sandbox.getModel(), $container)
        
        // TODO: maybe have this wait on `willMount`?
        if (newTab.didMount) newTab.didMount(sandbox, $container)

        // Let the previous plugin do any slow work after it's all done
        // TODO: maybe make this async? (as in Promise.resolve().then() stuff)
        if (oldTab && oldTab.didUnmount) oldTab.didUnmount(sandbox, $container)
    };

    return {
        willMount(sandbox, $root) {
            const ds = utils.createDesignSystem($root);
            const $bar = ds.createTabBar();
            $root.appendChild($bar);
            $root.appendChild($container);
            const $$tabs: HTMLButtonElement[] = [];

            const tabClicked: HTMLButtonElement['onclick'] = (event) => {
                const oldTab = active;
                let newTabButton = event.target as HTMLElement
                // It could be a notification you clicked on
                if (newTabButton.tagName === "DIV") {
                    newTabButton = newTabButton.parentElement!; 
                }
                const newTab = tabs.find(tab => newTabButton.id.endsWith(tab.id))!;
                activateTab(newTab, oldTab, sandbox, $container, $bar);
                active = newTab;
            };
            
            tabs.forEach(tab => {
                const $tab = ds.createTabButton(tab.displayName);
                $tab.id = patchId(tab.id);
                $$tabs.push($tab);
                $bar.appendChild($tab);

                $tab.onclick = tabClicked;
            });

            if ($$tabs.length) {
                $$tabs[0].onclick!({ target: $$tabs[0] } as any);
            }
        },
        willUnmount(sandbox, _) {
            if (active && active.willUnmount) {
                active.willUnmount(sandbox, $container);
            }
        },
        didMount(sandbox, _) {
            if (active && active.didMount) {
                active.didMount(sandbox, $container);
            }
        },
        didUnmount(sandbox, _) {
            if (active && active.didUnmount) {
                active.didUnmount(sandbox, $container);
            }
        },
        modelChanged(sandbox, model, _) {
            if (active && active.modelChanged) {
                active.modelChanged(sandbox, model, $container);
            }
        },
        modelChangedDebounce(sandbox, model, _) {
            if (active && active.modelChangedDebounce) {
                active.modelChangedDebounce(sandbox, model, $container);
            }
        },
    };
}

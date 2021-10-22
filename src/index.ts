import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground"

import ts from "typescript";
import { tabs } from './tabs';
import { createTabManager } from "./util/tab-manager";
import { injectGlobalStyles } from "./util/css";

const DO_INJECT_GLOBAL_STYLES = true;

export default function makePlugin(utils: PluginUtils): PlaygroundPlugin {
    const id = 'live-transformer';
    const displayName = 'Live Transformer';

    // Inject some minor opinionated styles
    if (DO_INJECT_GLOBAL_STYLES) {
        injectGlobalStyles();
    }

    const [major, minor] = ts.versionMajorMinor.split('.').map(n => Number(n));
    const isSupported = (major === 4 && minor >= 3) || (major > 4);
    if (!isSupported) {
        const warningHtml = `<div class="markdown"><blockquote>NOTE: The Live Transformer plugin only supports TypeScript <code>&gt;= 4.3</code></blockquote></div>`;
        return {
            id,
            displayName,
            willMount(sandbox, container) {
                container.innerHTML = warningHtml;
            },
        };
    }

    return {
        id,
        displayName,
        ...createTabManager(tabs, { namespace: id, utils }),
    };
}

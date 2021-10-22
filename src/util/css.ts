
export function injectGlobalStyles() {
    const $style = document.createElement('style');
    $style.innerHTML = `
#playground-container .playground-sidebar .playground-plugin-tabview {
    margin-bottom: 0;
}
#playground-container .playground-sidebar .playground-plugin-container pre {
    padding-top: 4px;
    padding-bottom: 4px;
}

.dark-theme .playground-sidebar .playground-plugin-container .fluid-button {
    background-color: var(--background-color);
    border-color: var(--border-color);
    color: var(--text-color);
}

.dark-theme .playground-sidebar .playground-plugin-container .fluid-button:hover {
    background-color: var(--raised-background);
    cursor: pointer;
}
`;
    return document.head.appendChild($style);
}
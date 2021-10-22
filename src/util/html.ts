
export function createMarkdownContainer(html: string, replaceRefs?: Record<string, Element>) {
    const $container = createHtmlContainer(html, replaceRefs);
    $container.classList.add('markdown');
    return $container;
}

export function createHtmlContainer(html: string, replaceRefs?: Record<string, Element>) {
    const $container = document.createElement('div');
    $container.innerHTML = html;
    if (replaceRefs) {
        Object.entries(replaceRefs).forEach(([ref, $replacer]) => {
            const $ref = $container.querySelector(`[data-ref="${ref}"]`);
            if ($ref && $ref.parentElement) {
                $ref.parentNode!.replaceChild($replacer, $ref);
            }
        });
    }
    return $container;
}

export function createButton(label?: string, eventListeners?: Record<string, (event?: Event) => void>) {
    const $button = document.createElement('button');
    if (label) {
        $button.innerText = label;
    }
    $button.classList.add('fluid-button');
    if (eventListeners) {
        Object.entries(eventListeners).forEach(([name, listener]) => {
            $button.addEventListener(name, listener);
        });
    }
    return $button;
}

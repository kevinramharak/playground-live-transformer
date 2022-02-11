import type { Range } from 'monaco-editor';
import type { Sandbox } from "../vendor/sandbox";

const SOURCE = 'playground-live-transformer';

export async function colorize(sandbox: Sandbox, code: string, options?: { tabSize?: number } ) {
    return sandbox.monaco.editor.colorize(code, 'typescript', { tabSize: 4, ...options });
}

export function replaceEditorContents(sandbox: Sandbox, text: string, range: Range = sandbox.getModel().getFullModelRange()) {
    return sandbox.editor.executeEdits(SOURCE, [{ text, range }]);
}

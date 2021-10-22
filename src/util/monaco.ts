import type { Sandbox } from "../vendor/sandbox";

export async function colorize(sandbox: Sandbox, code: string, options?: { tabSize?: number } ) {
    return sandbox.monaco.editor.colorize(code, 'typescript', { tabSize: 4, ...options });
}

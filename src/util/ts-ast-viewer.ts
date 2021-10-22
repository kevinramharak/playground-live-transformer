import { lzstring } from "./lzstring";

export function openSourceCodeInTsAstViewer(source: string) {
    const base64Source = lzstring.compressToEncodedURIComponent(source);
    open(`https://ts-ast-viewer.com/#code/${base64Source}`, '_blank');
}

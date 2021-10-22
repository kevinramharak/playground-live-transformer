
interface LZString {
    compressToBase64(source: string): string;
    compressToEncodedURIComponent(source: string): string;
}

export const lzstring: LZString = (window as any).LZString;
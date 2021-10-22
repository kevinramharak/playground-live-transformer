
declare module '*.md' {
    const html: string;
    const metadata: Record<PropertyKey, any>;
    const filename: string;
    export {
        html,
        metadata,
        filename,
    };
}

declare module '*.ts.tpl' {
    const contents: string;
    export default contents;
}

declare module '*.html.tpl' {
    const contents: string;
    export default contents;
}

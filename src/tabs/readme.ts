import { PlaygroundPlugin, PluginUtils } from "../vendor/playground";

interface IPluginData {

}

const readme = `
This plugin allows you to write a TypeScript AST transformer in the playground and run it right away. <br/>
Press the button above to setup a template and use the 'Transform' tab to run your transformer.<br />
<br />
More resources can be found at <br/>
<ul>
    <li>
        <a href="https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API" target="_blank">
            https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
        </a>
    </li>
    <li>
        <a href="https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API" target="_blank">
            https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
        </a>
    </li>
</ul>
<br />
Or come have a chat in the <a href="https://discord.gg/typescript" rel="noopener" target="_blank">TypeScript Community Discord.</a>
<br />
<br />
<strong>NOTE:</strong> <br/>
The current plugin implementation isn't very error friendly yet. If you have any issues please report them on <a href="https://github.com/kevinramharak/playground-live-transformer/issues" target="_blank" rel="noopener">Github</a>
`;

const template = `
/**
 * The playground does not support imports and exports by default.
 * The plugin strips all imports except 'typescript' and makes sure its available for the transformer
 */
import ts from 'typescript';

/**
 * We start with a program transformer 
 * The transformer signature is based on https://github.com/cevek/ttypescript#program
 */
const programTransformer = (program: ts.Program) => {
    const checker = program.getTypeChecker();
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.Node => {
                if (ts.isBinaryExpression(node)) {
                    if (ts.isNumericLiteral(node.left) && ts.isNumericLiteral(node.right)) {
                        // A great way to explore the AST is to use https://ts-ast-viewer.com/
                        // It will show you everything you need to know when working with an typescript AST
                        // because we checked 'node.left' and 'node.right' we can (somewhat) safely assume the following type assertions
                        // this is just an example of how you can use the type checker to hook into the type system
                        const lhs = checker.getTypeAtLocation(node.left) as ts.NumberLiteralType;
                        const rhs = checker.getTypeAtLocation(node.right) as ts.NumberLiteralType;
                        switch (node.operatorToken.kind) {
                            case ts.SyntaxKind.PlusToken:
                                return context.factory.createNumericLiteral(lhs.value + rhs.value);
                        }
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(sourceFile, visitor);
        }
    }
}

/**
 * The plugin will assume the default export is your program transformer
 */
export default programTransformer;

/**
 * Every top level Block statement with a leading multiline comment containing @transform will be fed to the transformer
 * @transform
 */
{
    // Our transformer will evaluate the '2 + 2' expression and transform it into the result '4'
    // because our implementation is very naive, it doesnt fully evaluate the expression yet
    // can you implement it that it will fully evaluate the expression at compile time?
    const result = 2 + 2 + 4 + 8;
}
`;

export function createReadme(utils: PluginUtils): PlaygroundPlugin {
    const data: IPluginData = {}

    return {
        id: 'readme',
        displayName: 'Readme',
        data,
        willMount(sandbox, container) {
            const ds = utils.createDesignSystem(container);
            const $button = ds.button({
                label: 'Replace the editor contents with a template',
                onclick() {
                    // TODO: use sandbox.editor.getModel() and its user friendly api so undo is possible
                    sandbox.setText(template);
                }
            });
            $button.style.marginBottom = '16px';
            const $readme = ds.p(readme);
        },
        didMount() {

        },
        willUnmount(sandbox, container) {

        },
        didUnmount(sandbox, container) {

        },
    };
}

import { PlaygroundPlugin, PluginUtils } from "../vendor/playground";

interface IPluginData {

}

const readme = `

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
                       // because we checked 'node.left' and 'node.right' we can (somewhat) safely assume the following type assertions
                       // A great way to explore the AST is to use https://ts-ast-viewer.com/
                       // It will show you everything you need to know when working with an typescript AST
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

// ------------------------------------------------------------------------ //
// ------------------------------------------------------------------------ //
// ------------------------------------------------------------------------ //

/**
 * Every top level Block statement with a leading multiline comment containing @transform will be fed to the transformer
 * @transform
 */
{
    // Our transformer will evaluate the '2 + 2' expression and transform it into the result '4'
    const result = 2 + 2;
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
            const $readme = ds.p(readme);
            const $button = ds.button({
                label: 'Setup a template',
                onclick() {
                    // TODO: use sandbox.editor.getModel() and its user friendly api so undo is possible
                    sandbox.setText(template);
                }
            })
        },
        didMount() {

        },
        willUnmount(sandbox, container) {

        },
        didUnmount(sandbox, container) {

        },
    };
}

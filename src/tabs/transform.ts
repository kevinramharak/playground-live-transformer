import ts from 'typescript';
import {} from 'ts-expose-internals';
import { PlaygroundPlugin, PluginUtils } from "../vendor/playground";

interface IPluginData {

}

/**
 * 
 */
function createTransformerFactory(output: { blocks: ts.Block[], imports: ts.ImportDeclaration[] }) {
    return function transformerFactory(context: ts.TransformationContext) {
        return function transformer(sourceFile: ts.SourceFile): ts.SourceFile {
            const sourceFileText = sourceFile.getFullText();
            function visitor(node: ts.Node): ts.Node | undefined {
                if (ts.isImportDeclaration(node)) {
                    output.imports.push(node);
                    return;
                }
                if (ts.isBlock(node)) {
                    
                    const comments = ts.getLeadingCommentRanges(sourceFileText, node.getFullStart()) || [];
                    const multiline = comments.filter(comment => comment.kind === ts.SyntaxKind.MultiLineCommentTrivia);
                    if (multiline.some(range => {
                        const content = sourceFileText.slice(range.pos, range.end);
                        // https://regexr.com/5ohbm - check if there is a single line containing @transform
                        return /^[^\w]+@transform\s*$/gm.test(content);
                    })) {
                        output.blocks.push(node);
                        return;
                    };
                }
                return ts.visitEachChild(node, visitor, context);
            }
            
            return ts.visitNode(sourceFile, visitor);
        }
    }
}

function evaluateTransformer(imports: ts.ImportDeclaration[], code: string) {
    const tsImport = imports.find(importDeclaration => (importDeclaration.moduleSpecifier as ts.StringLiteral).text === 'typescript');

    if (!tsImport) {
        throw new Error(`expected the transformer to have an import declaration for 'typescript'`);
    }

    if (!tsImport.importClause) {
        throw new Error(`expected the 'typescript' import to have an import clause`);
    }

    try {
        const module = { exports: {} };
        const closure = new Function('ts', 'module', 'exports', code);
        const result = closure(ts, module, module.exports);
        return module.exports;
    } catch (e) {
        console.error(e);
    }
}

/**
 * See: https://stackoverflow.com/questions/61097931/get-output-location-for-a-sourcefile-given-compileroptions
 */
function getEmitHost(program: ts.Program, host: ts.CompilerHost): ts.EmitHost {
    return {
        ...program,
        ...host,
        isEmitBlocked: () => false,
        getPrependNodes: () => [],
    } as any;
}

export function createTransform(utils: PluginUtils): PlaygroundPlugin {
    const data: IPluginData = {}

    const BLOCKS_FILE_NAME = '/blocks.ts';
    const TRANSFORMER_FILE_NAME = '/transformer.ts';

    return {
        id: 'transform',
        displayName: 'Transform',
        data,
        willMount(sandbox, container) {
            const { tsvfs } = sandbox;
            const ds = utils.createDesignSystem(container);

            const $code = ds.code('');
            $code.innerHTML = '// The transformer output will appear here';
            
            const $button = ds.button({
                label: 'Run the transformer',
                async onclick() {
                    try {
                        const output: Parameters<typeof createTransformerFactory>[0] = { blocks: [], imports: [] };
                        const transformerFactory = createTransformerFactory(output);
                        const compilerOptions = sandbox.getCompilerOptions();
                        const fs = await tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts);
                        const system = tsvfs.createSystem(fs);
                        const { compilerHost: host, updateFile } = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
                        
                        const writer = ts.createTextWriter(host.getNewLine());
                        const printer = ts.createPrinter();

                        host.writeFile(sandbox.filepath, sandbox.getText(), false);

                        const program = ts.createProgram({
                            rootNames: [sandbox.filepath],
                            options: compilerOptions,
                            host,
                        });

                        const sourceFile = program.getSourceFile(sandbox.filepath)!;
                        const result = ts.transform(sourceFile, [transformerFactory], compilerOptions);
                        const resultFile = result.transformed[0];

                        printer.writeFile(resultFile, writer, void 0);
                        host.writeFile(TRANSFORMER_FILE_NAME, writer.getText(), false);
                        writer.clear();

                        const transformerProgram = ts.createProgram({
                            rootNames: [TRANSFORMER_FILE_NAME],
                            options: compilerOptions,
                            host,
                        });
                        const transformerFile = transformerProgram.getSourceFile(TRANSFORMER_FILE_NAME)!;
                        const checker = transformerProgram.getDiagnosticsProducingTypeChecker();
                        ts.emitFiles(
                            checker.getEmitResolver(),
                            getEmitHost(transformerProgram, host),
                            transformerFile,
                            {
                                scriptTransformers: [
                                    ts.transformTypeScript,
                                    ts.transformModule,
                                ],
                                declarationTransformers: [],
                            }
                        );

                        const compiledOutput = fs.get(TRANSFORMER_FILE_NAME.replace(/\.tsx?/, '.js'));
                        if (!compiledOutput) {
                            console.warn('no output');
                            return;
                        }

                        // TODO: use the typechecker to see what type of transformer it is
                        const evaluated = evaluateTransformer(output.imports, compiledOutput) as { default: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile> };
                        
                        if (typeof evaluated.default !== 'function') {
                            throw new TypeError('expected the default export to be the program transformer factory, but the default export is not a function');
                        }

                        output.blocks.forEach(block => {
                            block.statements.forEach(node => {
                                printer.writeNode(ts.EmitHint.Unspecified, node, sourceFile, writer);
                            });
                        });

                        host.writeFile(BLOCKS_FILE_NAME, writer.getText(), false);
                        writer.clear();
                        const inputProgram = ts.createProgram({
                            rootNames: [BLOCKS_FILE_NAME],
                            options: compilerOptions,
                            host,
                        });

                        const transformer = evaluated.default(inputProgram);
                        const inputFile = inputProgram.getSourceFile(BLOCKS_FILE_NAME)!;
                        const transformerResult = ts.transform(inputFile, [transformer], compilerOptions);

                        printer.writeFile(transformerResult.transformed[0], writer, void 0);
                        const text = writer.getText();
                        writer.clear();

                        sandbox.monaco.editor.colorize(text, 'typescript', { tabSize: 4 }).then(html => {
                            $code.innerHTML = html;
                        });
                    } catch (e) {
                        $code.innerHTML = e.stack;
                    }
                }
            });

            // messy, but it works
            $button.after($code.parentElement!);

            $button.style.marginBottom = '16px';
        },
        didMount() {},
        willUnmount(sandbox, container) {},
        didUnmount(sandbox, container) {},
    };
}

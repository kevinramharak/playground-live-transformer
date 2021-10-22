
import ts from 'typescript';
import { createButton, createHtmlContainer } from '../../util/html';
import { colorize } from '../../util/monaco';
import { createTransformerModule } from '../../util/transformer-host';
import { CheckerTransformer, CompilerOptionsTransformer, ConfigTransformer, NodeTransformer, ProgramTransformer, RawTransformer } from '../../util/transformer-types';
import { openSourceCodeInTsAstViewer } from '../../util/ts-ast-viewer';
import type { PlaygroundPlugin, PluginUtils } from "../../vendor/playground";
import type { Sandbox } from '../../vendor/sandbox';

import content from './transformer.html.tpl';

/**
 * For some reason `ts.getJSDocTags` doesnt work inside our context, cant figure out why so we roll our own
 */
function getJSDocTags(node: ts.Node) {
    const jsDoc = (node as any)['jsDoc'] as ts.JSDoc[] || [];
    return jsDoc.map(jsDoc => jsDoc.tags || []).reduce((flat, deep) => [...flat, ...deep] as any, []) as readonly ts.JSDocTag[];
}

function isTransformBlock(node: ts.Node) {
    return ts.isBlock(node) && getJSDocTags(node).some(tag => tag.tagName.text === 'transform');
}

export function createTransform(utils: PluginUtils): PlaygroundPlugin {
    const TRANSFORM_BLOCKS_FILE_NAME = '/blocks.ts';
    const TRANSFORMER_FILE_NAME = '/transformer.ts';

    async function createCompilerHost(tsvfs: Sandbox['tsvfs'], compilerOptions: ts.CompilerOptions) {
        const fs = await tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts);
        const system = tsvfs.createSystem(fs);
        return { fs, system, ...tsvfs.createVirtualCompilerHost(system, compilerOptions, ts) };
    }

    return {
        id: 'transform',
        displayName: 'Transform',
        willMount(sandbox, container) {
            const ds = utils.createDesignSystem(container);
            const { tsvfs } = sandbox;
            const $code = ds.code('');
            colorize(sandbox, '// The transformer output will appear here').then(highlighted => {
                $code.innerHTML = highlighted;
            });

            const $openInTsAstExplorer = createButton('Open in TS AST Viewer', {
                /**
                 * TODO: benchmark this and move it to webworker if it blocks to much
                 */
                async click() {
                    const compilerOptions = sandbox.getCompilerOptions();
                    const { compilerHost: host } = await createCompilerHost(tsvfs, compilerOptions);
                    host.writeFile(sandbox.filepath, sandbox.getText(), false);

                    const program = ts.createProgram({
                        rootNames: [sandbox.filepath],
                        options: compilerOptions,
                        host,
                    });

                    const sourceFile = program.getSourceFile(sandbox.filepath)!;
                    const blocks = sourceFile.statements.filter(isTransformBlock);

                    const printer = ts.createPrinter();
                    const source = printer.printList(ts.ListFormat.SourceFileStatements, blocks as unknown as ts.NodeArray<ts.Statement>, sourceFile);
                    openSourceCodeInTsAstViewer(source);
                }
            });

            const $runTransformer = createButton('Run the transformer', {
                /**
                 * TODO: benchmark this and move it to webworker if it blocks to much
                 * TODO: maybe use an incremental builder instead?
                 * TODO: see: https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#writing-an-incremental-program-watcher
                 */
                async click() {
                    try {
                        const compilerOptions: ts.CompilerOptions = {
                            ...sandbox.getCompilerOptions(),
                            module: ts.ModuleKind.CommonJS,
                        };
                        const { compilerHost: host, fs } = await createCompilerHost(tsvfs, compilerOptions);
                        host.writeFile(sandbox.filepath, sandbox.getText(), false);

                        const program = ts.createProgram({
                            rootNames: [sandbox.filepath],
                            options: compilerOptions,
                            host,
                        });

                        const sourceFile = program.getSourceFile(sandbox.filepath)!;

                        // Get the blocks with the `@transform` tag
                        const transformBlocks = sourceFile.statements.filter(isTransformBlock);
                        // write the transform blocks to a file, ready to be transformed
                        host.writeFile(TRANSFORM_BLOCKS_FILE_NAME, ts.createPrinter().printList(ts.ListFormat.SourceFileStatements, ts.factory.createNodeArray(transformBlocks), sourceFile), false);
                        // write the remaining statements to a file, to create the transformer from
                        host.writeFile(TRANSFORMER_FILE_NAME, ts.createPrinter().printList(ts.ListFormat.SourceFileStatements, ts.factory.createNodeArray(sourceFile.statements.filter(statement => !transformBlocks.includes(statement) && !ts.isImportDeclaration(statement))), sourceFile), false);

                        // compile both files as a seperate program
                        const splitProgram = ts.createProgram({
                            rootNames: [TRANSFORM_BLOCKS_FILE_NAME, TRANSFORMER_FILE_NAME],
                            options: compilerOptions,
                            host,
                            oldProgram: program,
                        });

                        // TODO: can this happen async? Maybe in a service worker?
                        const transformerSourceFile = splitProgram.getSourceFile(TRANSFORMER_FILE_NAME)!;
                        splitProgram.emit(transformerSourceFile);
                        const transformerSource = fs.get(TRANSFORMER_FILE_NAME.replace(/\.tsx?$/, '.js')) || '';

                        const evaluated = createTransformerModule(sourceFile.statements.filter(statement => ts.isImportDeclaration(statement)) as ts.ImportDeclaration[], transformerSource);

                        let transformer: ProgramTransformer;
                        switch (evaluated.type || 'node') {
                            case 'checker': {
                                transformer = (program: ts.Program, config: any) => {
                                    return (evaluated.default as CheckerTransformer)(program.getTypeChecker(), config);
                                };
                                break;
                            }
                            case 'compilerOptions': {
                                transformer = (program: ts.Program, config: any) => {
                                    return (evaluated.default as CompilerOptionsTransformer)(program.getCompilerOptions(), config);
                                };
                                break;
                            }
                            case 'config': {
                                transformer = (program: ts.Program, config: any) => {
                                    return (evaluated.default as ConfigTransformer)(config);
                                };
                                break;
                            }
                            case 'node': {
                                transformer = (program: ts.Program, config: any) => {
                                    const checker = program.getTypeChecker();
                                    return (context) => {
                                        return (sourceFile) => {
                                            const visitor = (node: ts.Node): ts.Node => {
                                                node = ts.visitEachChild(node, visitor, context)
                                                return (evaluated.default as NodeTransformer)(node, {
                                                    checker,
                                                    context,
                                                    program,
                                                    sourceFile,
                                                });
                                            }
                                            return ts.visitNode(sourceFile, visitor);
                                        }
                                    };
                                };
                                break;
                            }
                            case 'program': {
                                transformer = evaluated.default as ProgramTransformer;
                                break;
                            }
                            case 'raw': {;
                                transformer = (program: ts.Program, config: any) => {
                                    return (evaluated.default as RawTransformer);
                                };
                                break;
                            }
                            default: {
                                throw new TypeError(`'${evaluated.type}' is an invalid transformer type`);
                                break;
                            }
                        }

                        const transformBlocksSourceFile = splitProgram.getSourceFile(TRANSFORM_BLOCKS_FILE_NAME)!;
                        const transformationResult = ts.transform(transformBlocksSourceFile, [
                            transformer(splitProgram, evaluated.config),
                        ], compilerOptions);

                        const transformBlocksResultFile = transformationResult.transformed[0];
                        if (!transformBlocksResultFile) {
                            throw new TypeError('missing transformation result');
                        }

                        const transformBlocksResult = ts.createPrinter().printFile(transformBlocksResultFile);
                        colorize(sandbox, transformBlocksResult, { tabSize: 4 }).then(html => {
                            $code.innerHTML = html;
                        });
                    } catch (e) {
                        if (e instanceof Error) {
                            console.error(e);
                            $code.innerText = e.stack || '';
                        } else if (e != null) {
                            $code.innerText = (e as any).toString();
                        }
                    }
                }
            });

            const $contents = createHtmlContainer(content, {
                'transformer-output': $code.parentNode! as HTMLElement,
                'open-in-ts-ast-viewer': $openInTsAstExplorer,
                'run-transformer': $runTransformer,
            })

            container.appendChild($contents);
        },
    };
}

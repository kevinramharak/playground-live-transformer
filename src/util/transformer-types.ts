import ts from 'typescript';

// support: https://github.com/nonara/ts-patch#source-transformer-signatures
// and: https://github.com/cevek/ttypescript#pluginconfigtype
export type VisitorContext = {
    program: ts.Program,
    checker: ts.TypeChecker,
    context: ts.TransformationContext,
    sourceFile: ts.SourceFile,
};

export type ProgramTransformer<Config = any> = (program: ts.Program, config?: Config) => ts.TransformerFactory<ts.SourceFile>;
export type ConfigTransformer<Config = any> = (config: Config) => ts.TransformerFactory<ts.SourceFile>;
export type CheckerTransformer<Config = any> = (checker: ts.TypeChecker, config?: Config) => ts.TransformerFactory<ts.SourceFile>;
export type CompilerOptionsTransformer<Config = any> = (compilerOptions: ts.CompilerOptions, config?: Config) => ts.TransformerFactory<ts.SourceFile>;
export type RawTransformer = ts.TransformerFactory<ts.SourceFile>;
export type NodeTransformer = <T extends ts.Node>(node: T, context: VisitorContext) => ts.Node;

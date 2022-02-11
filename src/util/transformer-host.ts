
import ts from 'typescript';
import { CheckerTransformer, CompilerOptionsTransformer, ConfigTransformer, NodeTransformer, ProgramTransformer, RawTransformer } from './transformer-types';

export type TransformerType = 'program' | 'config' | 'checker' | 'compilerOptions' | 'raw' | 'node';
export type Transformer = ProgramTransformer | ConfigTransformer | CheckerTransformer | CompilerOptionsTransformer | RawTransformer | NodeTransformer;

export function createTransformerModule<T extends Transformer = Transformer>(imports: ts.ImportDeclaration[], code: string): { default: T, type?: TransformerType, config?: any } {
    const tsImport = imports.find(importDeclaration => (importDeclaration.moduleSpecifier as ts.StringLiteral).text === 'typescript');

    if (!tsImport) {
        throw new Error(`missing an import declaration for 'typescript'. your code requires a 'import ts from "typescript"'`);
    }

    if (!tsImport.importClause) {
        throw new Error(`import 'typescript' needs an import clause. invalid example 'import "typescript"'`);
    }

    if (tsImport.importClause.isTypeOnly) {
        throw new Error(`cannot import 'typescript' as type only. invalid example 'import type ts from "typescript"'`);
    }

    if (!tsImport.importClause.name) {
        throw new Error(`the 'typescript' import needs to be a named import. for example: 'import ts from "typescript"'`);
    }

    if (tsImport.importClause.namedBindings) {
        throw new Error(`named imports for the 'typescript' module are not supported. invalid example: 'import { namedThing } from "typescript"'`);
    }

    try {
        const module = { exports: {} };
        const injectedParameterNames = [tsImport.importClause.name.text];
        const injectedParameters = [ts];
        const closure = new Function('module', 'exports', '__filename', '__dirname', ...injectedParameterNames, code);
        closure(module, module.exports, 'index.ts', '/', ...injectedParameters);
        return module.exports as any;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

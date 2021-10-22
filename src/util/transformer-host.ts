
import ts from 'typescript';

export function createTransformerModule(imports: ts.ImportDeclaration[], code: string) {
    const tsImport = imports.find(importDeclaration => (importDeclaration.moduleSpecifier as ts.StringLiteral).text === 'typescript');

    if (!tsImport) {
        throw new Error(`missing an import declaration for 'typescript'`);
    }

    if (!tsImport.importClause) {
        throw new Error(`import 'typescript' needs an import clause`);
    }

    if (tsImport.importClause.isTypeOnly) {
        throw new Error(`cannot import 'typescript' as type only`);
    }

    if (!tsImport.importClause.name) {
        throw new Error(`the 'typescript' import needs to be a named import`);
    }

    if (tsImport.importClause.namedBindings) {
        throw new Error(`named imports for 'typescript' are not supported`);
    }

    try {
        const module = { exports: {} };
        const closure = new Function(tsImport.importClause.name.text, 'module', 'exports', code);
        closure(ts, module, module.exports);
        return module.exports;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

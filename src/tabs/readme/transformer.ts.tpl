/**
 * The playground does not support imports and exports by default.
 * The plugin strips all imports except 'typescript' and makes sure its available for the transformer
 */
import ts from 'typescript';

/**
 * Any top level block statement with a `@transform` tag will be input for the transformer
 * @transform
 */
{
    // we can evaluate these expressions at compile time
    const expressions = [
        1 + 1, // 2
        2 - 1, // 1
        3 * 3, // 9
        4 / 2, // 2
        5 % 2, // 1
    ];
    const x = 3;
    //    ^?
    // and since we know the value of x at compile time, we can even evaluate this expression
    const y = x * x;
}

/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
    checker: ts.TypeChecker,
    context: ts.TransformationContext,
    program: ts.Program,
    sourceFile: ts.SourceFile,
};

const transformer = (node: ts.Node, { checker, context }: VisitorContext): ts.Node => {
    if (ts.isBinaryExpression(node)) {
        if (ts.isNumericLiteral(node.left) && ts.isNumericLiteral(node.right)) {
            // a great way to explore the AST is to use https://ts-ast-viewer.com/
            // use the Transform tab to easily open the AST for any given code
            // it will show you everything you need to know when working with an typescript AST
            // because we checked 'node.left' and 'node.right' we can (somewhat) safely assume the following type assertions
            // this is just an example of how you can use the type checker to hook into the type system
            const lhs = checker.getTypeAtLocation(node.left) as ts.NumberLiteralType;
            const rhs = checker.getTypeAtLocation(node.right) as ts.NumberLiteralType;
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.PlusToken:
                    return context.factory.createNumericLiteral(lhs.value + rhs.value);
                case ts.SyntaxKind.MinusToken:
                    return context.factory.createNumericLiteral(lhs.value - rhs.value);
                case ts.SyntaxKind.AsteriskToken:
                    return context.factory.createNumericLiteral(lhs.value * rhs.value);
                case ts.SyntaxKind.SlashToken:
                    return context.factory.createNumericLiteral(lhs.value / rhs.value);
                case ts.SyntaxKind.PercentToken:
                    return context.factory.createNumericLiteral(lhs.value % rhs.value);
            }
        }
        if (ts.isIdentifier(node.left) && ts.isIdentifier(node.right)) {
            // you can get creative with the type checker
            // and use it to evaluate expressions with known values
            // as long as the type of the identifier resolves to a constant value
            const lhs = checker.getTypeAtLocation(node.left);
            const rhs = checker.getTypeAtLocation(node.right);
            if (lhs.isNumberLiteral() && rhs.isNumberLiteral()) {
                switch (node.operatorToken.kind) {
                    case ts.SyntaxKind.PlusToken:
                        return context.factory.createNumericLiteral(lhs.value + rhs.value);
                    case ts.SyntaxKind.MinusToken:
                        return context.factory.createNumericLiteral(lhs.value - rhs.value);
                    case ts.SyntaxKind.AsteriskToken:
                        return context.factory.createNumericLiteral(lhs.value * rhs.value);
                    case ts.SyntaxKind.SlashToken:
                        return context.factory.createNumericLiteral(lhs.value / rhs.value);
                    case ts.SyntaxKind.PercentToken:
                        return context.factory.createNumericLiteral(lhs.value % rhs.value);
                }
            }
        }
    }
    return node;
}

/**
 * The default export should be your transformer
 */
export default transformer;

import { DSLLexer } from './lexer';
import { DSLParser, ASTNode } from './parser';
import { OPERATOR_PRECEDENCE } from './types/dsl';
import { DSLPreprocessor } from './preprocessor';

/**
 * 递归遍历 AST，将其转换为人类可读的字符串。
 * @param node 当前 AST 节点
 * @param parentPrecedence 父级运算符的优先级，用于决定是否需要加括号
 * @returns 格式化后的字符串
 */
const astToHumanView = (node: ASTNode, parentPrecedence = 0): string => {
  switch (node.type) {
    case 'Identifier':
      // 标识符格式化为 $[path]
      return `$[${node.path}]`;

    // 新增
    case 'TempVariable':
      // 临时变量格式化为 @[{scope}name]
      return `@[{${node.scope}}${node.name}]`;

    case 'Literal':
      // 字面量根据类型返回，字符串需要加上双引号
      // 格式化为 &[{type}value]
      return `&[{${node.value.type}}${node.value.value}]`;

    case 'FunctionCall': {
      // 函数调用，格式为 "#[{funcName}arg1, arg2, ...]"
      const args = node.args.map(arg => astToHumanView(arg, 0)).join(''); // 参数之间没有逗号
      return `#[{${node.name}}${args}]`;
    }

    case 'BinaryOp': {
      const currentPrecedence = OPERATOR_PRECEDENCE[node.operator] || 0;

      const left = astToHumanView(node.left, currentPrecedence);
      const right = astToHumanView(node.right, currentPrecedence);

      // 运算符格式化
      const opStr = ['+', '-', '*', '/', '%', '**', '='].includes(node.operator)
        ? `#[${node.operator}]`
        : `?[${node.operator}]`;

      const result = `${left} ${opStr} ${right}`;

      if (currentPrecedence < parentPrecedence) {
        return `(${result})`;
      }
      return result;
    }
  }
};

/**
 * 将DSL表达式转换为人类可读的格式。
 */
export const exprToHumanView = (localExpression: string): string => {
  if (!localExpression) return '';

  try {
    const cleanExpression = DSLPreprocessor.process(localExpression);
    const lexer = new DSLLexer(cleanExpression);
    const parser = new DSLParser(lexer);
    const ast = parser.parse();
    return astToHumanView(ast);
  } catch (error: any) {
    return `[Invalid Expression: ${error.message}]`;
  }
};

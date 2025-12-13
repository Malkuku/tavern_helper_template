// evaluator.ts
import { ASTNode, BinaryOpNode, FunctionCallNode, IdentifierNode, TempVariableNode } from './parser';
import { getValueByPath } from './pathUtils';

export type VariableStore = Map<string, any>;

export class DSLEvaluator {
  constructor(
    private data: any,
    private globalVars: VariableStore, // 全局变量
    private localVars: VariableStore   // 局部变量
  ) {}

  evaluate(node: ASTNode): any {
    switch (node.type) {
      case 'BinaryOp':
        return this.evaluateBinaryOp(node);
      case 'FunctionCall':
        return this.evaluateFunctionCall(node);
      case 'Identifier':
        return this.evaluateIdentifier(node);
      case 'Literal':
        return node.value.value;
      case 'TempVariable':
        return this.evaluateTempVariable(node);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private evaluateBinaryOp(node: BinaryOpNode): any {
    if (node.operator === '=') {
      return this.performAssignment(node.left, node.right);
    }
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    // 为算术和比较运算符增加严格的类型检查
    const isArithmetic = ['+', '-', '*', '/', '%', '**'].includes(node.operator);
    const isComparison = ['<', '>', '<=', '>='].includes(node.operator);

    // 1. 算术运算符：严格要求操作数必须为数字
    if (isArithmetic) {
      if (typeof left !== 'number' || typeof right !== 'number') {
        const leftValStr = JSON.stringify(left);
        const rightValStr = JSON.stringify(right);
        throw new Error(
          `Type mismatch for arithmetic operator '${node.operator}'. ` +
          `Both operands must be numbers, but got ${typeof left} (${leftValStr}) and ${typeof right} (${rightValStr}).`
        );
      }
    }

    // 2. 比较运算符：要求操作数类型必须相同
    if (isComparison) {
      const leftType = typeof left;
      const rightType = typeof right;

      if (leftType !== rightType) {
        const leftValStr = JSON.stringify(left);
        const rightValStr = JSON.stringify(right);
        throw new Error(
          `Type mismatch for comparison operator '${node.operator}'. ` +
          `Operands must be of the same type, but got ${leftType} (${leftValStr}) and ${rightType} (${rightValStr}).`
        );
      }
      // 额外检查：禁止对 object 类型进行比较（除了 null）
      if (leftType === 'object' && left !== null) {
        throw new Error(`Cannot use operator '${node.operator}' on objects.`);
      }
    }

    switch (node.operator) {
      case '&&': return left && right;
      case '||': return left || right;
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '**': return Math.pow(left, right);
      default:
        throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  private performAssignment(leftNode: ASTNode, rightNode: ASTNode): any {
    const valueToAssign = this.evaluate(rightNode);

    if (leftNode.type === 'TempVariable') {
      // 根据 scope 决定写入哪个变量池
      const store = leftNode.scope === 'g' ? this.globalVars : this.localVars;
      store.set(leftNode.name, valueToAssign);
    }
    return valueToAssign;
  }

  private evaluateTempVariable(node: TempVariableNode): any {
    // 根据 scope 决定从哪个变量池读取
    const store = node.scope === 'g' ? this.globalVars : this.localVars;
    if (!store.has(node.name)) {
      throw new Error(`Temporary variable '@[${node.scope}]${node.name}' has not been defined.`);
    }
    return store.get(node.name);
  }

  // evaluateFunctionCall 和 evaluateIdentifier 保持不变
  private evaluateFunctionCall(node: FunctionCallNode): any {
    const args = node.args.map(arg => this.evaluate(arg));
    switch (node.name) {
      case 'neg': return -Number(args[0]);
      case 'sum': return args.reduce((acc, val) => acc + Number(val), 0);
      case 'avg': return args.length === 0 ? 0 : args.reduce((acc, val) => acc + Number(val), 0) / args.length;
      case 'ln': return Math.log(Number(args[0]));
      case 'log2': return Math.log2(Number(args[0]));
      case 'sqrt': return Math.sqrt(Number(args[0]));
      case 'abs': return Math.abs(Number(args[0]));
      case 'floor': return Math.floor(Number(args[0]));
      case 'ceil': return Math.ceil(Number(args[0]));
      case 'max': return Math.max(...args.map(Number));
      case 'min': return Math.min(...args.map(Number));
      default: throw new Error(`Unknown function: ${node.name}`);
    }
  }

  private evaluateIdentifier(node: IdentifierNode): any {
    const pathSegments = node.path.split('.');
    const value = getValueByPath(this.data, pathSegments);
    // 当路径解析结果为 undefined 时，应立即抛出错误，而不是静默返回
    if (value === undefined) {
      // 这里的错误信息对于调试非常有用
      throw new Error(`Path '${node.path}' does not exist or its value is undefined.`);
    }
    return value;
  }
}

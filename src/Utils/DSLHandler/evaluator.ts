// evaluator.ts
import { ASTNode, BinaryOpNode, FunctionCallNode, IdentifierNode } from './parser';
import { getValueByPath } from './pathUtils';
export class DSLEvaluator {
  constructor(private data: any) {}

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
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private evaluateBinaryOp(node: BinaryOpNode): any {
    // 对于赋值操作，我们需要特殊处理
    if (node.operator === '=') {
      return this.performAssignment(node.left, node.right);
    }

    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      // Logic
      case '&&': return left && right;
      case '||': return left || right;

      // Comparison
      case '==': return left == right; // 宽松相等，或者用 ===
      case '!=': return left != right;
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);

      // Math
      case '+': return Number(left) + Number(right);
      case '-': return Number(left) - Number(right);
      case '*': return Number(left) * Number(right);
      case '/': return Number(left) / Number(right);
      case '%': return Number(left) % Number(right);
      case '**': return Math.pow(Number(left), Number(right));

      default:
        throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  private performAssignment(leftNode: ASTNode, rightNode: ASTNode): any {
    if (leftNode.type !== 'Identifier') {
      throw new Error("Invalid assignment target");
    }
    const value = this.evaluate(rightNode);
    const path = leftNode.path;

    // 这里执行实际的数据修改
    // 注意：我们需要一个 setValueByPath 工具函数
    this.setValueByPath(this.data, path.split('.'), value);
    return value;
  }

  private evaluateFunctionCall(node: FunctionCallNode): any {
    const args = node.args.map(arg => this.evaluate(arg));

    switch (node.name) {
      case 'ln': return Math.log(Number(args[0]));
      case 'log2': return Math.log2(Number(args[0]));
      case 'sqrt': return Math.sqrt(Number(args[0]));
      case 'abs': return Math.abs(Number(args[0]));
      case 'floor': return Math.floor(Number(args[0]));
      case 'ceil': return Math.ceil(Number(args[0]));
      case 'max': return Math.max(...args.map(Number));
      case 'min': return Math.min(...args.map(Number));
      default:
        throw new Error(`Unknown function: ${node.name}`);
    }
  }

  private evaluateIdentifier(node: IdentifierNode): any {
    // path 已经是具体的
    return getValueByPath(this.data, node.path.split('.'));
  }

  // 简单的设置值辅助函数
  private setValueByPath(obj: any, path: string[], value: any) {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) current[key] = {};
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }
}

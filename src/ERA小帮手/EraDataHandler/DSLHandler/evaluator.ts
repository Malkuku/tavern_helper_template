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
    // ... (switch for operators remains the same)
    switch (node.operator) {
      case '&&': return left && right;
      case '||': return left || right;
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);
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
    const value = store.get(node.name);
    return value === undefined ? null : value;
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
    return getValueByPath(this.data, node.path.split('.'));
  }
}

// evaluator.ts
import { ASTNode, BinaryOpNode, UnaryOpNode, IdentifierNode, LiteralNode } from './parser';
import { EvalContext } from './types/dsl';

export class DSLEvaluator {
  constructor(private context: EvalContext) {}

  evaluate(node: ASTNode): any {
    switch (node.type) {
      case 'BinaryOp':
        return this.evaluateBinaryOp(node);
      case 'UnaryOp':
        return this.evaluateUnaryOp(node);
      case 'Identifier':
        return this.evaluateIdentifier(node);
      case 'Literal':
        return this.evaluateLiteral(node);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private evaluateBinaryOp(node: BinaryOpNode): any {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      // 逻辑运算符
      case '&&':
        return left && right;
      case '||':
        return left || right;

      // 比较运算符
      case '==':
        return this.deepEqual(left, right);
      case '!=':
        return !this.deepEqual(left, right);
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '<=':
        return left <= right;
      case '>=':
        return left >= right;

      // 算术运算符
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) {
          throw new Error('Division by zero');
        }
        return left / right;
      case '%':
        if (right === 0) {
          throw new Error('Division by zero in modulo operation');
        }
        return left % right;
      case '**':
        return Math.pow(left, right);

      default:
        throw new Error(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateUnaryOp(node: UnaryOpNode): any {
    const operand = this.evaluate(node.operand);

    switch (node.operator) {
      case '{ln}':
        if (operand <= 0) {
          throw new Error('Logarithm of non-positive number');
        }
        return Math.log(operand);
      case '{log2}':
        if (operand <= 0) {
          throw new Error('Logarithm of non-positive number');
        }
        return Math.log2(operand);
      case '{sqrt}':
        if (operand < 0) {
          throw new Error('Square root of negative number');
        }
        return Math.sqrt(operand);
      case '{abs}':
        return Math.abs(operand);
      case '{floor}':
        return Math.floor(operand);
      case '{ceil}':
        return Math.ceil(operand);
      default:
        throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateIdentifier(node: IdentifierNode): any {
    // 特殊变量 $this
    if (node.path === '$this') {
      return this.context.getValueByPath(this.context.thisPath);
    }

    return this.context.getValueByPath(node.path);
  }

  private evaluateLiteral(node: LiteralNode): any {
    return node.value.value;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!(k in b) || !this.deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
}

// evaluator.ts
import { ASTNode, BinaryOpNode, UnaryOpNode, IdentifierNode, LiteralNode } from './parser';
import { EvalContext } from './types/dsl';

// 存储通配符映射的全局变量，用于在同一表达式中保持通配符一致性
let wildcardMapping: Record<string, string> = {};

export class DSLEvaluator {
  constructor(private context: EvalContext) {}

  evaluate(node: ASTNode): any {
    // 初始化通配符映射
    wildcardMapping = {};
    
    const result = this._evaluate(node);
    
    // 清空通配符映射
    wildcardMapping = {};
    return result;
  }

  private _evaluate(node: ASTNode): any {
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

    // 处理数组情况（通配符路径）
    if (Array.isArray(left) || Array.isArray(right)) {
      // 如果任一操作数是数组，我们需要特殊处理
      if (Array.isArray(left) && Array.isArray(right)) {
        // 两个都是数组
        return this.performArrayOperation(left, right, node.operator);
      } else if (Array.isArray(left)) {
        // 只有左侧是数组
        return left.map(item => this.performOperation(item.value, right, node.operator));
      } else {
        // 只有右侧是数组
        return right.map(item => this.performOperation(left, item.value, node.operator));
      }
    }

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

  private performArrayOperation(left: any[], right: any[], operator: string): any[] {
    const result: any[] = [];
    
    // 确保两个数组长度相同
    const maxLength = Math.max(left.length, right.length);
    
    for (let i = 0; i < maxLength; i++) {
      const l = i < left.length ? left[i].value : left[left.length - 1].value;
      const r = i < right.length ? right[i].value : right[right.length - 1].value;
      const path = i < left.length ? left[i].path : right[i].path;
      
      result.push({
        path,
        value: this.performOperation(l, r, operator)
      });
    }
    
    return result;
  }

  private performOperation(left: any, right: any, operator: string): any {
    switch (operator) {
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
        throw new Error(`Unknown binary operator: ${operator}`);
    }
  }

  private evaluateUnaryOp(node: UnaryOpNode): any {
    const operand = this.evaluate(node.operand);

    // 处理数组情况（通配符路径）
    if (Array.isArray(operand)) {
      return operand.map(item => ({
        path: item.path,
        value: this.performUnaryOperation(item.value, node.operator)
      }));
    }

    return this.performUnaryOperation(operand, node.operator);
  }

  private performUnaryOperation(operand: any, operator: string): any {
    switch (operator) {
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
        throw new Error(`Unknown unary operator: ${operator}`);
    }
  }

  private evaluateIdentifier(node: IdentifierNode): any {
    // 特殊变量 $this
    if (node.path === '$this') {
      return this.context.getValueByPath(this.context.thisPath, false, wildcardMapping);
    }

    return this.context.getValueByPath(node.path, false, wildcardMapping);
  }

  private evaluateLiteral(node: LiteralNode): any {
    return [{ path: '', value: node.value.value }]; // 文本节点没有路径
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
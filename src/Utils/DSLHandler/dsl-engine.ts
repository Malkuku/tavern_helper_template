// dsl-engine.ts
import { DSLLexer } from './lexer';
import { DSLParser } from './parser';
import { DSLEvaluator } from './evaluator';
import { EvalContext } from './types/dsl';

export interface DSLResult {
  success: boolean;
  value?: any;
  error?: string;
}

export class DSLEngine {
  /**
   * 执行条件表达式
   * @param expression 如 "<<if> ($[path1] ?[<=] $[$this]) ?[&&] ($[$this] ?(==) &[{num}5])>"
   * @param context 求值上下文
   */
  static evaluateIf(expression: string, context: EvalContext): DSLResult {
    try {
      // 移除 <<if> 和 > 标记
      const cleaned = this.extractContent(expression, 'if');
      const result = this.evaluateExpression(cleaned, context);
      return { success: true, value: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行操作表达式
   * @param expression 如 "<<op> $[path] #[+] $[$this]>"
   * @param context 求值上下文
   */
  static evaluateOp(expression: string, context: EvalContext): DSLResult {
    try {
      const cleaned = this.extractContent(expression, 'op');
      const result = this.evaluateExpression(cleaned, context);
      return { success: true, value: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private static evaluateExpression(expression: string, context: EvalContext): any {
    const lexer = new DSLLexer(expression);
    const parser = new DSLParser(lexer);
    const ast = parser.parse();
    const evaluator = new DSLEvaluator(context);
    return evaluator.evaluate(ast);
  }

  private static extractContent(expression: string, type: 'if' | 'op'): string {
    // 匹配 <<if> content > 或 <<op> content >
    const pattern = new RegExp(`<<${type}>\\s*(.*?)\\s*>`, 's');
    const match = expression.match(pattern);
    if (!match) {
      throw new Error(`Invalid ${type} expression format: ${expression}`);
    }
    return match[1].trim();
  }

  /**
   * 解析路径中的通配符并获取所有匹配的路径
   * @param data 数据对象
   * @param pathPattern 带通配符的路径，如 "角色.*.特殊状态.好感度"
   * @param wildcardMapping 通配符映射，用于保持同一层级的一致性
   * @returns 匹配的所有完整路径数组
   */
  static expandWildcardPaths(data: any, pathPattern: string, wildcardMapping: Record<string, string> = {}): string[] {
    const parts = pathPattern.split('.');
    const results: string[] = [];

    this._expandRecursive(data, parts, 0, [], results, wildcardMapping);
    return results;
  }

  private static _expandRecursive(
    node: any,
    parts: string[],
    index: number,
    currentPath: string[],
    results: string[],
    wildcardMapping: Record<string, string>
  ) {
    if (index >= parts.length) {
      results.push(currentPath.join('.'));
      return;
    }

    const part = parts[index];

    if (part === '*') {
      // 通配符：遍历所有属性
      if (node && typeof node === 'object') {
        // 检查是否已经有该层级的映射
        const levelKey = `level_${index}`;
        if (wildcardMapping[levelKey]) {
          // 使用已有的映射
          const mappedKey = wildcardMapping[levelKey];
          if (mappedKey in node) {
            this._expandRecursive(
              node[mappedKey],
              parts,
              index + 1,
              [...currentPath, mappedKey],
              results,
              wildcardMapping
            );
          }
        } else {
          // 第一次遇到该层级的通配符，遍历所有属性
          for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
              // 创建新的映射
              const newMapping = { ...wildcardMapping, [levelKey]: key };
              this._expandRecursive(
                node[key],
                parts,
                index + 1,
                [...currentPath, key],
                results,
                newMapping
              );
            }
          }
        }
      }
    } else {
      // 固定部分
      // eslint-disable-next-line no-lonely-if
      if (node && typeof node === 'object' && part in node) {
        this._expandRecursive(
          node[part],
          parts,
          index + 1,
          [...currentPath, part],
          results,
          wildcardMapping
        );
      }
      // 处理以 * 开头、中间或结尾的情况
      else if (node && typeof node === 'object' && part === '*' && index === parts.length - 1) {
        // 遍历所有属性
        for (const key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            results.push([...currentPath, key].join('.'));
          }
        }
      }
    }
  }
}
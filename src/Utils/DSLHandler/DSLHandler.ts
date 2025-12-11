// DSLHandler.ts
import { DSLEngine, DSLResult } from './dsl-engine';
import { DSLLexer } from './lexer';
import { DSLParser } from './parser';
import { getValueByPath, setValueByPath as utilsSetValue, parsePath } from './pathUtils';

/**
 * DSL 处理器
 * 统一向外暴露 DSL 的执行、验证和工具方法
 */
export const DSLHandler = {
  /**
   * 执行 DSL 表达式 (If 或 Op)
   * @param expression 完整的 DSL 表达式，如 "<<op> $[角色.*.好感度] #[+] 10>"
   * @param data 数据源快照 (JSON 对象)
   * @returns 执行结果 { success: boolean, value: Array<{path?, value}>, error? }
   */
  execute(expression: string, data: any): DSLResult {
    return DSLEngine.evaluate(expression, data);
  },

  /**
   * 验证 DSL 表达式的语法是否正确
   * 注意：此方法只检查语法结构，不检查路径是否存在于数据中
   * @param expression DSL 表达式
   */
  validate(expression: string): { success: boolean; error?: string } {
    try {
      // 1. 词法分析 (Lexer 内部会处理 wrapper 头)
      const lexer = new DSLLexer(expression);

      // 2. 语法分析
      const parser = new DSLParser(lexer);
      parser.parse();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 工具：通过字符串路径获取值
   * @param data 数据源
   * @param pathStr 路径字符串，如 "角色.星宫诗羽.好感度"
   */
  getValue(data: any, pathStr: string): any {
    const segments = parsePath(pathStr);
    return getValueByPath(data, segments);
  },

  /**
   * 工具：通过字符串路径设置值
   * @param data 数据源 (会被修改)
   * @param pathStr 路径字符串
   * @param value 要设置的值
   */
  setValue(data: any, pathStr: string, value: any): void {
    const segments = parsePath(pathStr);
    // 这里我们需要一个简单的 setValue 实现，通常 pathUtils 里会有
    // 如果 pathUtils 没有暴露，我们可以在这里简单实现一个，或者复用 evaluator 里的逻辑
    utilsSetValue(data, segments, value);
  },

  // --- 兼容旧接口别名 (可选) ---

  /**
   * 执行条件表达式 (别名)
   */
  evaluateIf(expression: string, data: any): DSLResult {
    return this.execute(expression, data);
  },

  /**
   * 执行操作表达式 (别名)
   */
  evaluateOp(expression: string, data: any): DSLResult {
    return this.execute(expression, data);
  }
};

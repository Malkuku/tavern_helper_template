// dsl-engine.ts
import { DSLLexer } from './lexer';
import { DSLParser } from './parser';
import { DSLEvaluator } from './evaluator';
import { RuleParser } from './ruleParser';
import { DSLPreprocessor } from './preprocessor';

export interface DSLResultItem {
  path?: string; // 如果是赋值操作，返回被修改的路径
  value: any;    // 表达式的计算结果
}

export interface DSLResult {
  success: boolean;
  value?: DSLResultItem[];
  error?: string;
}

export class DSLEngine {
  /**
   * 执行 DSL 表达式 (支持 <<if>> 和 <<op>>)
   * @param expression 原始表达式，例如 "<<op> $[角色.*.好感度] #[=] 10>"
   * @param data 数据源 (JSON 对象)
   */
  static evaluate(expression: string, data: any): DSLResult {
    try {
      // 0. 预处理
      // 去除杂余的空格、换行，规范化表达式
      const cleanExpression = DSLPreprocessor.process(expression);


      // 1. 通配符展开 (Context-Aware Expansion)
      // 将包含 * 的表达式展开为针对具体路径的多个表达式
      // 例如: "$[角色.*.A] + $[角色.*.B]" -> ["$[角色.P1.A] + $[角色.P1.B]", "$[角色.P2.A] + $[角色.P2.B]"]

      // 使用RuleParser 类进行表达式展开
      const parser = new RuleParser(data);
      const concreteExpressions = parser.expand(cleanExpression);

      const results: DSLResultItem[] = [];

      // 2. 遍历执行每一个具体表达式
      for (const expr of concreteExpressions) {
        // 2.1 词法分析
        // Lexer 内部会自动处理/跳过 <<if> / <<op> 等 wrapper 头
        const lexer = new DSLLexer(expr);

        // 2.2 语法分析
        const parser = new DSLParser(lexer);
        const ast = parser.parse();

        // 2.3 求值
        // Evaluator 会直接修改 data (如果是赋值操作) 并返回计算结果
        const evaluator = new DSLEvaluator(data);
        const resultValue = evaluator.evaluate(ast);

        // 2.4 结果封装
        // 我们需要判断这是否是一个赋值操作，以便在返回结果中带上 path
        let modifiedPath: string | undefined = undefined;

        // 检查 AST 根节点是否为赋值操作 (BinaryOp with operator '=')
        // 并且左侧必须是一个 Identifier
        if (
          ast.type === 'BinaryOp' &&
          ast.operator === '=' &&
          ast.left.type === 'Identifier'
        ) {
          modifiedPath = ast.left.path;
        }

        results.push({
          path: modifiedPath,
          value: resultValue
        });
      }

      return {
        success: true,
        value: results
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error during DSL execution'
      };
    }
  }
}

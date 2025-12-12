// dsl-engine.ts
import { DSLLexer } from './lexer';
import { ASTNode, DSLParser } from './parser';
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

  // --- AST 缓存 ---
  // Key: 预处理后的表达式字符串, Value: 解析后的 AST 根节点
  private static astCache = new Map<string, ASTNode>();
  // 设置一个最大缓存大小，防止内存溢出
  private static MAX_CACHE_SIZE = 2000;
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
      let concreteExpressions: string[];
      if (cleanExpression.includes('*')) {
        const parser = new RuleParser(data);
        concreteExpressions = parser.expand(cleanExpression);
      } else {
        concreteExpressions = [cleanExpression];
      }

      const results: DSLResultItem[] = [];

      // 2. 遍历执行每一个具体表达式
      for (const expr of concreteExpressions) {
        let ast: ASTNode;

        // --- 优化后的缓存逻辑 (LRU) ---
        if (this.astCache.has(expr)) {
          ast = this.astCache.get(expr)!;

          // 【关键】：命中缓存后，先删除再重新 set。
          // 这会将该条目移动到 Map 的末尾（表示最近刚被使用过）
          this.astCache.delete(expr);
          this.astCache.set(expr, ast);
        } else {
          // 缓存未命中：解析
          const lexer = new DSLLexer(expr);
          const parser = new DSLParser(lexer);
          ast = parser.parse();

          // 检查容量
          if (this.astCache.size >= this.MAX_CACHE_SIZE) {
            // 【关键】：Map.keys().next().value 获取的是第一个插入的键（也就是最久没被使用的）
            // 删除它，腾出空间
            const oldestKey = this.astCache.keys().next().value;
            if(oldestKey) this.astCache.delete(oldestKey);
          }
          // 插入新值（会自动排在 Map 末尾）
          this.astCache.set(expr, ast);
        }


        // 3. 求值
        // Evaluator 会直接修改 data (如果是赋值操作) 并返回计算结果
        const evaluator = new DSLEvaluator(data);
        const resultValue = evaluator.evaluate(ast);

        // 4. 结果封装
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

  /**
   * 手动清除缓存
   */
  static clearCache() {
    this.astCache.clear();
  }
}

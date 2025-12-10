import {
  createEvalContext as dslCreatEvalContext,
  getValueByPath as dslGetValueByPath,
  getValueByPathDirect as dslGetValueByPathDirect,
  setValueByPath as dslSetValueByPath
} from './utils';
import { EvalContext } from './types/dsl';
import { DSLEngine, DSLResult } from './dsl-engine';
import { DSLLexer } from './lexer';
import { DSLParser } from './parser';
import { eraLogger } from '../../ERA小帮手/utils/EraHelperLogger';

/**
 * 定义操作结果的接口
 */
interface OperationResult {
  path: string;
  value: any;
  success: boolean;
  error?: string;
}

/**
 * 创建求值上下文
 * @param data 当前数据（会修改）
 * @param snapshot 快照（只读）
 * @param thisPath 处理为逗号路径的jsonPath
 */
const createEvalContext = (
  data: any,
  snapshot: any,
  thisPath: string
): EvalContext => {
  return dslCreatEvalContext(data, snapshot, thisPath);
};

/**
 * 执行条件表达式
 * @param ifExpr 如 "<<if> ($[path1] ?[<=] $[$this]) ?[&&] ($[$this] ?(==) &[{num}5])>"
 * @param context 求值上下文
 */
const evaluateIf = (ifExpr: string, context: EvalContext): DSLResult => {
  return DSLEngine.evaluateIf(ifExpr, context);
};

/**
 * 执行操作表达式
 * @param opExpr 如 "<<op> $[path] #[+] $[$this]>"
 * @param context 求值上下文
 */
const evaluateOp = (opExpr: string, context: EvalContext): DSLResult => {
  return DSLEngine.evaluateOp(opExpr, context);
}

/**
 * 通过路径获取值（支持通配符）
 * @param data 数据对象
 * @param path 路径
 * @param snapshot 快照对象
 * @param wildcardMapping 通配符映射
 */
const getValueByPath = (data: any, path: string, snapshot?: any, wildcardMapping?: Record<string, string>): {path: string, value: any}[] => {
  return dslGetValueByPath(data, path, snapshot, wildcardMapping);
}

/**
 * 通过路径获取值（不支持通配符）
 * @param data 数据对象
 * @param path 路径
 * @param snapshot 快照对象
 */
const getValueByPathDirect = (data: any, path: string, snapshot?: any): {path: string, value: any}[] => {
  return dslGetValueByPathDirect(data, path, snapshot);
}

/**
 * 通过路径设置值
 * @param data 数据对象
 * @param path 路径
 * @param value 值
 */
const setValueByPath = (data: any, path: string, value: any): void => {
  return dslSetValueByPath(data, path, value);
};

/**
 * 验证DSL表达式语法
 * @param expression DSL表达式
 * @param type 表达式类型 ('if' 或 'op')
 */
const validateDSL = (expression: string, type: 'if' | 'op'): DSLResult => {
  try {
    // 移除标签
    const cleaned = expression.replace(new RegExp(`<<${type}>\\s*(.*?)\\s*>`, 's'), '$1').trim();
    
    // 尝试词法分析和语法分析
    const lexer = new DSLLexer(cleaned);
    const tokens = lexer.tokenize();
    
    const parser = new DSLParser(lexer);
    const ast = parser.parse();
    
    return { success: true, value: ast };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 向外提供dsl的接口
 */
export const DSLHandler = {
  createEvalContext,
  evaluateIf,
  evaluateOp,
  validateDSL, // 添加语法验证方法
  getValueByPath,
  getValueByPathDirect,
  setValueByPath
}

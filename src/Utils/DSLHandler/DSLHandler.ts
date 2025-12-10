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
 * 测试dsl语法
 * @param testData 测试数据
 * @param snapshot 快照数据
 * @param path 测试路径
 * @param ifExpr if表达式 '<<if> $[角色.角色A.特殊状态.好感度] ?[>=] &[{num}40]>'
 * @param opExpr op表达式 '<<op> $[角色.角色A.特殊状态.好感度] #[+] &[{num}10]>
 */
const testDsl = (testData: object,snapshot: object, path: string,ifExpr: string,opExpr: string)=>{
  const planeSnapshot = JSON.parse(JSON.stringify(snapshot));
  eraLogger.log(
    '加载测试数据:', testData,
    '快照:', planeSnapshot,
    '测试路径:', path,
    '条件表达式:', ifExpr,
    '操作表达式:', opExpr,
  )

  const context = createEvalContext(testData, planeSnapshot, path);
  // 测试条件表达式
  let output = '';
  let conditionResult: DSLResult | null = null;
  if(ifExpr){
    const result = DSLEngine.evaluateIf(ifExpr, context);
    conditionResult = result;
    output += `条件表达式：${ifExpr}\n`;
    output += `条件表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`
    eraLogger.log(`条件表达式：${ifExpr}，结果：${JSON.stringify(result)}`);
    output += '========================\n';
  }

  // 测试操作表达式
  if(opExpr){
    // 如果有条件表达式且结果为false，则不执行操作表达式
    if (conditionResult && !conditionResult.value) {
      output += `由于条件表达式结果为false，跳过执行操作表达式：${opExpr}\n`;
      eraLogger.log(`由于条件表达式结果为false，跳过执行操作表达式：${opExpr}`);
      output += '========================\n';
    } else {
      const result = DSLEngine.evaluateOp(opExpr, context);
      output += `操作表达式：${opExpr}\n`;
      output += `操作表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`;
      eraLogger.log(`操作表达式：${opExpr}，结果：${JSON.stringify(result)}`);
      output += '========================\n';

      // 如果操作成功并且有返回值，则更新测试数据
      if (result.success && result.value) {
        // 处理返回的路径和值
        if (Array.isArray(result.value)) {
          // 多个路径的情况（通配符）
          result.value.forEach(({ path: resultPath, value: resultValue }) => {
            setValueByPath(testData, resultPath, resultValue);
          });
        } else {
          // 单个值的情况
          setValueByPath(testData, path, result.value);
        }
      }
    }
  }

  return output;
}

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
  setValueByPath,
  testDsl
}

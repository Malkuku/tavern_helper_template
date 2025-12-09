import {
  createEvalContext as dslCreatEvalContext,
  getValueByPath as dslGetValueByPath,
  getValueByPathDirect as dslGetValueByPathDirect,
} from './utils';
import { EvalContext } from './types/dsl';
import { DSLEngine, DSLResult } from './dsl-engine';

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
 * 测试dsl语法
 * @param testData 测试数据
 * @param snapshot 快照数据
 * @param path 测试路径
 * @param ifExpr if表达式 '<<if> $[角色.角色A.特殊状态.好感度] ?[>=] &[{num}40]>'
 * @param opExpr op表达式 '<<op> $[角色.角色A.特殊状态.好感度] #[+] &[{num}10]>
 */
const testDsl = (testData: object,snapshot: object, path: string,ifExpr: string,opExpr: string)=>{
  const planeSnapshot = JSON.parse(JSON.stringify(snapshot));
  console.log(
    '加载测试数据:', testData,
    '快照:', planeSnapshot,
    '测试路径:', path,
    '条件表达式:', ifExpr,
    '操作表达式:', opExpr,
  )

  const context = createEvalContext(testData, planeSnapshot, path);
  // 测试条件表达式
  let output = '';
  if(ifExpr){
    const result = DSLEngine.evaluateIf(ifExpr, context);
    output += `条件表达式：${ifExpr}\n`;
    output += `条件表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`
    console.log(`条件表达式：${ifExpr}，结果：${JSON.stringify(result)}`);
    output += '========================\n';
  }

  // 测试操作表达式
  if(opExpr){
    const result = DSLEngine.evaluateOp(opExpr, context);
    output += `操作表达式：${opExpr}\n`;
    output += `条件表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`;
    console.log(`条件表达式：${ifExpr}，结果：${JSON.stringify(result)}`);
    output += '========================\n';
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
  getValueByPath,
  getValueByPathDirect,
  testDsl
}
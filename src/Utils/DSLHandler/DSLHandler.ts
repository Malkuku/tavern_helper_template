import {
  createEvalContext as dslCreatEvalContext,
  getValueByPath as dslGetValueByPath,
  getValueByPathDirect as dslGetValueByPathDirect,
} from './utils';
import { EvalContext } from './types/dsl';
import { DSLEngine, DSLResult } from './dsl-engine';

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
 */
const getValueByPath = (data: any, path: string, snapshot?: any): any[] => {
  return dslGetValueByPath(data, path, snapshot);
}

/**
 * 通过路径获取值（不支持通配符）
 * @param data 数据对象
 * @param path 路径
 * @param snapshot 快照对象
 */
const getValueByPathDirect = (data: any, path: string, snapshot?: any): any[] => {
  return dslGetValueByPathDirect(data, path, snapshot);
}

/**
 * 向外提供dsl的接口
 */
export const DSLHandler = {
  createEvalContext,
  evaluateIf,
  evaluateOp,
  getValueByPath,
  getValueByPathDirect
}

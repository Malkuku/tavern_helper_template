import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from './DSLHandler/DSLHandler';
import { eraLogger } from '../utils/EraHelperLogger';
import { RuleParser } from './DSLHandler/ruleParser';

const MAX_LOOP_COUNT = 2000;

// --- 类型定义 ---

interface LogEntry {
  ruleName: string;
  path: string;
  action: 'handle' | 'limit' | 'range' | 'skip' | 'error';
  message: string;
  changes?: { from: any; to: any };
  success: boolean;
}

interface OperationResult {
  path: string;
  value: any;
  success: boolean;
  error?: string;
  log?: LogEntry; // 结构化日志
}

// --- 日志处理器 ---

class EraRuleLogger {
  private logs: LogEntry[] = [];

  add(entry: LogEntry) {
    this.logs.push(entry);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  toString(): string {
    if (this.logs.length === 0) return '没有执行任何操作';
    return this.logs
      .map(l => {
        const status = l.success ? '✅' : '❌';
        const change = l.changes ? ` (${l.changes.from} -> ${l.changes.to})` : '';
        return `[${l.ruleName}] ${status} [${l.action}] ${l.path}: ${l.message}${change}`;
      })
      .join('\n');
  }

  clear() {
    this.logs = [];
  }
}

// --- 工具函数 ---

/**
 * 将 Map 上下文转为数组
 */
const contextMapToArray = (map: Map<number, string>): string[] => {
  const result: string[] = [];
  // 假设通配符序号从 1 开始连续
  for (let i = 1; i <= map.size; i++) {
    result.push(map.get(i) || '');
  }
  return result;
};

/**
 * 将数据合并到快照中，仅合并类型匹配的字段
 */
const mergeDataToSnapshot = (data: any, snap: any): any => {
  const merged = JSON.parse(JSON.stringify(snap));
  const merge = (target: any, source: any) => {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (Object.prototype.hasOwnProperty.call(target, key) && typeof target[key] === typeof source[key]) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            merge(target[key], source[key]);
          } else if (Array.isArray(target[key]) === Array.isArray(source[key])) {
            target[key] = source[key];
          }
        }
      }
    }
  };
  merge(merged, data);
  return merged;
};

/**
 * 比较对象差异
 */
const diffObjects = (obj: any, base: any): any => {
  const compare = (current: any, original: any): any => {
    if (typeof current !== 'object' || current === null || original === null) {
      return current !== original ? current : undefined;
    }
    if (Array.isArray(current)) {
      if (!Array.isArray(original) || current.length !== original.length) return current;
      const arrDiff = current.map((item, i) => compare(item, original[i])).filter(x => x !== undefined);
      return arrDiff.length > 0 ? current : undefined; // 数组简化处理：有变动则返回全量
    }
    let hasChanges = false;
    const objDiff: any = {};
    for (const key in current) {
      const valDiff = compare(current[key], original[key]);
      if (valDiff !== undefined) {
        objDiff[key] = valDiff;
        hasChanges = true;
      }
    }
    return hasChanges ? objDiff : undefined;
  };
  return compare(obj, base) || {};
};

/**
 * 注入通配符上下文到表达式字符串中
 * @param expression 原始表达式 "$[角色.*.好感度]"
 * @param wildcards 通配符对应的值列表 ["星宫诗羽"]
 * @returns 注入后的表达式 "$[角色.星宫诗羽.好感度]"
 */
const injectWildcards = (expression: string, wildcards: string[]): string => {
  if (!wildcards.length) return expression;

  // 匹配 $[...] 结构
  return expression.replace(/\$\[(.*?)\]/g, (match, content) => {
    const parts = content.split('.');
    let wildcardIndex = 0;
    const newParts = parts.map((part: string) => {
      if (part === '*' && wildcardIndex < wildcards.length) {
        return wildcards[wildcardIndex++];
      }
      return part;
    });
    return `$[${newParts.join('.')}]`;
  });
};

/**
 * 从具体路径中提取通配符对应的值
 * @param pattern 规则路径 "角色.*.状态.*"
 * @param concretePath 具体路径 "角色.A.状态.B"
 * @returns ["A", "B"]
 */
const extractWildcardValues = (pattern: string, concretePath: string): string[] => {
  const pParts = pattern.split('.');
  const cParts = concretePath.split('.');
  const values: string[] = [];

  for (let i = 0; i < Math.min(pParts.length, cParts.length); i++) {
    if (pParts[i] === '*') {
      values.push(cParts[i]);
    }
  }
  return values;
};

// --- 核心逻辑 ---
export const EraDataHandler = {
  /**
   * 主入口：应用规则
   */
  async applyRule(data: any, snap: any, rules: EraDataRule) {
    const logger = new EraRuleLogger();
    const workingData = mergeDataToSnapshot(data, snap);

    const sortedRules = Object.entries(rules)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

    eraLogger.log(`[EraDataHandler] 获取到原始数据`, data);
    eraLogger.log(`[EraDataHandler] 获取到快照`, snap);
    eraLogger.log(`[EraDataHandler] 处理原始数据为全量`, workingData);
    eraLogger.log(`[EraDataHandler] 正在处理规则`, sortedRules);

    for (const [ruleName, rule] of sortedRules) {
      if (!rule.enable) continue;

      try {
        // 统一调用 _processRule
        await this._processRule(workingData, snap, ruleName, rule, logger);
      } catch (e: any) {
        logger.add({
          ruleName,
          path: rule.path,
          action: 'error',
          success: false,
          message: e.message || 'Unknown error'
        });
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const diff = diffObjects(workingData, snap);
    return {
      data: diff,
      log: logger.toString(),
      rawLogs: logger.getLogs()
    };
  },

  /**
   * 统一规则处理器
   * 核心逻辑：获取上下文列表 -> 遍历上下文 -> 执行规则
   */
  async _processRule(data: any, snap: any, ruleName: string, rule: EraDataRule[string], logger: EraRuleLogger) {
    const ruleLoopCount = Math.max(1, Math.min(rule.loop ?? 1, MAX_LOOP_COUNT));

    // 1. 确定上下文来源 (Context Source)
    let contexts: Map<number, string>[] = [];

    if (rule.path === '*') {
      // --- Global Mode ---
      if (rule.if) {
        // 尝试从 rule.if 解析通配符上下文
        // 如果 rule.if 里没有通配符，getContexts 会返回 [new Map()] (即单次执行)
        const parser = new RuleParser(data);
        contexts = parser.getContexts(rule.if);
      } else {
        // 没有 if，也没有 path，默认为单次执行的空上下文
        contexts = [new Map()];
      }
    } else {
      // --- Scoped Mode ---
      // 展开 rule.path 获取具体目标
      const targets = DSLHandler.getValue(data, rule.path);
      if (Array.isArray(targets)) {
        contexts = targets.map(t => {
          // 从具体路径反解出通配符值
          const values = extractWildcardValues(rule.path, t.path);
          const map = new Map<number, string>();
          values.forEach((v, i) => map.set(i + 1, v));
          return map;
        });
      }
    }

    if (contexts.length === 0) return;

    // 2. 遍历每一个上下文 (Context Loop)
    for (const ctxMap of contexts) {
      const wildcardValues = contextMapToArray(ctxMap);

      // 计算当前上下文对应的具体 Path (仅用于 Scoped 模式下的 limit/range 计算)
      let currentPath = '';
      if (rule.path !== '*') {
        currentPath = injectWildcards(rule.path, wildcardValues);
      }

      // --- 优化开始：预先计算具体的表达式字符串 ---
      // 因为在同一个 Context 下，wildcardValues 是不变的，
      // 所以 injectWildcards 的结果在整个 ruleLoopCount 循环中都是一样的。
      const concreteIf = rule.if ? injectWildcards(rule.if, wildcardValues) : null;
      const preparedHandles: { key: string, cfg: any, concreteIf: string | null, concreteOp: string }[] = [];
      if (rule.handle) {
        const sortedHandles = Object.entries(rule.handle)
          .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

        for (const [key, cfg] of sortedHandles) {
          preparedHandles.push({
            key,
            cfg,
            concreteIf: cfg.if ? injectWildcards(cfg.if, wildcardValues) : null,
            concreteOp: injectWildcards(cfg.op, wildcardValues)
          });
        }
      }

      // 3. 规则级循环 (Rule Loop)
      for (let loopIndex = 0; loopIndex < ruleLoopCount; loopIndex++) {

        // --- A. Rule Level IF ---
        let isRuleMet = true;
        if (concreteIf) {
          // 直接使用预计算好的字符串，配合 DSLEngine 的 AST 缓存
          const ifRes = DSLHandler.execute(concreteIf, data);

          isRuleMet = ifRes.success && (Array.isArray(ifRes.value)
            ? ifRes.value.every(v => v.value === true)
            : !!ifRes.value);
        }
        // 如果条件不满足
        if (!isRuleMet) {
          // 如果是 Global 模式，或者不是第一次循环，直接退出
          // (Scoped 模式下，第一次循环即使条件不满足，也可能需要执行 limit/range)
          if (rule.path === '*' || loopIndex > 0) break;
        }

        // --- B. Handle Execution ---
        if (isRuleMet && preparedHandles.length > 0) {
          for (const item of preparedHandles) {
            const hLoop = Math.max(1, Math.min(item.cfg.loop ?? 1, MAX_LOOP_COUNT));

            for(let i=0; i<hLoop; i++) {
              // 使用预计算的字符串
              if (item.concreteIf) {
                const res = DSLHandler.execute(item.concreteIf, data);
                const isTrue = res.success && (Array.isArray(res.value) ? res.value.every(v => v.value === true) : !!res.value);
                if (!isTrue) break;
              }

              // 使用预计算的字符串
              const opRes = DSLHandler.execute(item.concreteOp, data);

              // 日志记录
              if (opRes.success && Array.isArray(opRes.value)) {
                opRes.value.forEach(v => {
                  logger.add({
                    ruleName,
                    path: v.path || currentPath || 'Global',
                    action: 'handle',
                    success: true,
                    message: `[${item.key}] Loop ${i + 1}/${hLoop} (Ctx: ${wildcardValues.join('.')})`,
                    changes: { from: '?', to: v.value }
                  });
                });
              } else if (!opRes.success) {
                logger.add({
                  ruleName,
                  path: currentPath || 'Global',
                  action: 'handle',
                  success: false,
                  message: `[${item.key}] Error: ${opRes.error}`
                });
              }
            }
          }
        }

        // --- C. Limit & Range (仅当有具体 Path 时生效) ---
        // 逻辑：Scoped 模式下，即使 if 不满足，第一次循环也要检查 limit/range
        if (currentPath && (isRuleMet || loopIndex === 0)) {
          this._applyLimitAndRange(data, snap, rule, currentPath, loopIndex, ruleLoopCount, logger, ruleName);
        }

        if (!isRuleMet) break;
      }
    }
  },

  /**
   *  Limit 和 Range 逻辑
   */
  _applyLimitAndRange(data: any, snap: any, rule: EraDataRule[string], currentPath: string, loopIndex: number, totalLoop: number, logger: EraRuleLogger, ruleName: string) {
    if (rule.limit && rule.limit.length === 2) {
      // limit 处理
      const currentV = DSLHandler.getValue(data, currentPath);
      const snapV = DSLHandler.getValue(snap, currentPath);

      if (typeof currentV === 'number' && typeof snapV === 'number') {
        const [minDelta, maxDelta] = rule.limit;
        const delta = currentV - snapV;
        let limitedDelta = delta;
        if (delta > maxDelta) limitedDelta = maxDelta;
        if (delta < minDelta) limitedDelta = minDelta;

        if (limitedDelta !== delta) {
          const finalVal = snapV + limitedDelta;
          DSLHandler.setValue(data, currentPath, finalVal);
          logger.add({
            ruleName,
            path: currentPath,
            action: 'limit',
            success: true,
            message: `Delta ${delta} limited to [${minDelta}, ${maxDelta}]`,
            changes: { from: currentV, to: finalVal }
          });
        }
      }
    }

    // Range 处理
    if (rule.range && rule.range.length === 2) {
      const currentV = DSLHandler.getValue(data, currentPath);

      if (typeof currentV === 'number') {
        const [min, max] = rule.range;
        const clamped = Math.max(min, Math.min(currentV, max));

        if (clamped !== currentV) {
          DSLHandler.setValue(data, currentPath, clamped);
          logger.add({
            ruleName,
            path: currentPath,
            action: 'range',
            success: true,
            message: `Value clamped to [${min}, ${max}]`,
            changes: { from: currentV, to: clamped }
          });
        }
      }
    }
  },
};

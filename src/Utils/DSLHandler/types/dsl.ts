// types/dsl.ts
export type TokenType =
  | 'IDENTIFIER'     // $[path], $[$this]
  | 'LITERAL'        // &[{num}1], &[{str}hello]
  | 'OPERATOR'       // ?[==], ?[>], #[+], #[{ln}]
  | 'LOGICAL_OP'     // ?[&&], ?[||]
  | 'LPAREN'         // (
  | 'RPAREN'         // )
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export interface LiteralValue {
  type: 'number' | 'string' | 'boolean' | 'null' | 'array' | 'object';
  value: any;
}

// 运算符优先级
export const OPERATOR_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
  '**': 6,
  '{ln}': 7, '{log2}': 7, '{sqrt}': 7, '{abs}': 7, '{floor}': 7, '{ceil}': 7,
};

// 求值上下文
export interface EvalContext {
  data: any;           // 当前数据（会修改）
  snapshot: any;       // 快照（只读）
  thisPath: string;    // 当前规则处理的路径
  getValueByPath: (path: string, fromSnapshot?: boolean) => any;
}
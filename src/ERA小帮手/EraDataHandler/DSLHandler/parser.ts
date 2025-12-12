// parser.ts
import { DSLLexer, Token, TokenType, parseLiteralValue, LiteralValue } from './lexer';

// AST Nodes
export type ASTNode =
  | BinaryOpNode
  | FunctionCallNode
  | IdentifierNode
  | LiteralNode;

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface IdentifierNode {
  type: 'Identifier';
  path: string;
}

export interface LiteralNode {
  type: 'Literal';
  value: LiteralValue;
}

export class DSLParser {
  private tokens: Token[];
  private position = 0;

  constructor(lexer: DSLLexer) {
    this.tokens = lexer.tokenize();
  }

  parse(): ASTNode {
    if (this.tokens.length === 0 || this.tokens[0].type === 'EOF') {
      throw new Error("Empty expression");
    }
    return this.parseExpression();
  }

  // 优先级：Assignment (=) 最低
  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    let node = this.parseLogicalOr();

    // 支持 #[=]
    if (this.match('OP_MATH', '=')) {
      const operator = this.previous().value;
      const right = this.parseAssignment(); // 右结合
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseLogicalOr(): ASTNode {
    let node = this.parseLogicalAnd();

    while (this.match('OP_LOGIC', '||')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseLogicalAnd(): ASTNode {
    let node = this.parseComparison();

    while (this.match('OP_LOGIC', '&&')) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseComparison(): ASTNode {
    let node = this.parseAdditive();

    // 比较运算符在 OP_LOGIC 中
    while (this.matchOp(['==', '!=', '<', '>', '<=', '>='])) {
      const operator = this.previous().value;
      const right = this.parseAdditive();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseAdditive(): ASTNode {
    let node = this.parseMultiplicative();

    while (this.matchOp(['+', '-'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseMultiplicative(): ASTNode {
    let node = this.parsePower();

    while (this.matchOp(['*', '/', '%'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parsePower(): ASTNode {
    let node = this.parsePrimary();

    if (this.matchOp(['**'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', 'Expected ")" after expression');
      return expr;
    }

    if (this.match('IDENTIFIER')) {
      return { type: 'Identifier', path: this.previous().value };
    }

    if (this.match('LITERAL')) {
      return { type: 'Literal', value: parseLiteralValue(this.previous().value) };
    }

    // 函数调用 #[{name}arg1arg2]
    if (this.match('FUNC_START')) {
      const funcName = this.previous().value;
      const args: ASTNode[] = [];

      // 解析参数直到遇到 RBRACKET
      while (!this.check('RBRACKET') && !this.isAtEnd()) {
        args.push(this.parsePrimary()); // 参数通常是 Primary (变量或字面量)，也可以是表达式
      }

      this.consume('RBRACKET', `Expected "]" after function arguments for ${funcName}`);
      return { type: 'FunctionCall', name: funcName, args };
    }

    throw new Error(`Unexpected token: ${this.peek().type} (${this.peek().value}) at ${this.peek().start}`);
  }

  // --- Helpers ---

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOp(values: string[], type: TokenType = 'OP_LOGIC'): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    // 兼容 OP_LOGIC 和 OP_MATH，或者指定类型
    if ((token.type === 'OP_LOGIC' || token.type === 'OP_MATH') && values.includes(token.value)) {
      // 如果指定了 type，必须匹配
      if (type && token.type !== type && type !== 'OP_LOGIC') {
        // 这里逻辑稍微有点绕，简化一下：
        // 比较运算符都在 OP_LOGIC 里，算术在 OP_MATH 里
      }
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }

  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }
}

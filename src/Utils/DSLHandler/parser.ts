// parser.ts
import { DSLLexer } from './lexer';
import { Token, TokenType, LiteralValue, OPERATOR_PRECEDENCE } from './types/dsl';

// AST 节点类型
export type ASTNode =
  | BinaryOpNode
  | UnaryOpNode
  | IdentifierNode
  | LiteralNode;

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: string;
  operand: ASTNode;
}

export interface IdentifierNode {
  type: 'Identifier';
  path: string;  // 路径字符串，如 "path" 或 "$this"
}

export interface LiteralNode {
  type: 'Literal';
  value: LiteralValue;
}

export class DSLParser {
  private tokens: Token[];
  private position = 0;

  constructor(private lexer: DSLLexer) {
    this.tokens = lexer.tokenize();
  }

  parse(): ASTNode {
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let node = this.parseLogicalAnd();

    while (this.match('LOGICAL_OP', '||')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseLogicalAnd(): ASTNode {
    let node = this.parseComparison();

    while (this.match('LOGICAL_OP', '&&')) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseComparison(): ASTNode {
    let node = this.parseAdditive();

    while (this.matchOperator(['==', '!=', '<', '>', '<=', '>='])) {
      const operator = this.previous().value;
      const right = this.parseAdditive();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseAdditive(): ASTNode {
    let node = this.parseMultiplicative();

    while (this.matchOperator(['+', '-'])) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseMultiplicative(): ASTNode {
    let node = this.parsePower();

    while (this.matchOperator(['*', '/', '%'])) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parsePower(): ASTNode {
    // 右结合性操作符
    let node = this.parseUnary();

    if (this.matchOperator(['**'])) {
      const operator = this.previous().value;
      const right = this.parsePower(); // 右结合性
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseUnary(): ASTNode {
    // 处理函数调用（如 #{ln} $[path]）
    if (this.matchOperator(['{ln}', '{log2}', '{sqrt}', '{abs}', '{floor}', '{ceil}'])) {
      const operator = this.previous().value;
      const operand = this.parsePrimary();
      return { type: 'UnaryOp', operator, operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', 'Expected ")" after expression');
      return expr;
    }

    if (this.match('IDENTIFIER')) {
      const token = this.previous();
      return { type: 'Identifier', path: token.value };
    }

    if (this.match('LITERAL')) {
      const token = this.previous();
      return { type: 'Literal', value: token.value as LiteralValue };
    }

    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  // Helper methods
  private match(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    this.position++;
    return true;
  }

  private matchOperator(ops: string[]): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== 'OPERATOR') return false;
    if (!ops.includes(token.value)) return false;
    this.position++;
    return true;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at position ${this.peek().start}`);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
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
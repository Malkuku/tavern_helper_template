// parser.ts
import { DSLLexer, Token, TokenType, parseLiteralValue, LiteralValue } from './lexer';

// AST Nodes
export type ASTNode =
  | BinaryOpNode
  | FunctionCallNode
  | IdentifierNode
  | LiteralNode
  | TempVariableNode; // 新增

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

// 新增
export interface TempVariableNode {
  type: 'TempVariable';
  scope: 'g' | 's';
  name: string;
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
      // 赋值操作是右结合的
      const right = this.parseAssignment();

      // 赋值的左侧必须是标识符或临时变量
      if (node.type !== 'Identifier' && node.type !== 'TempVariable') {
        throw new Error(`Invalid assignment target: ${node.type}. Must be a path or a temporary variable.`);
      }

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

    // 新增
    if (this.match('TEMP_VARIABLE')) {
      const rawValue = this.previous().value; // e.g., "{g}myVar"
      const match = rawValue.match(/^\{(g|s)\}(.+)$/);
      if (!match) {
        // This should not happen if lexer is correct
        throw new Error(`Internal parser error: Invalid temp variable format ${rawValue}`);
      }
      const [, scope, name] = match;
      return { type: 'TempVariable', scope: scope as 'g' | 's', name };
    }

    if (this.match('LITERAL')) {
      return { type: 'Literal', value: parseLiteralValue(this.previous().value) };
    }

    if (this.match('FUNC_START')) {
      const funcName = this.previous().value;
      const args: ASTNode[] = [];

      while (!this.check('RBRACKET') && !this.isAtEnd()) {
        // 函数参数可以是任何表达式，而不仅仅是 primary
        args.push(this.parseExpression());
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

  private matchOp(values: string[], type?: TokenType): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();

    const typeMatch = type ? token.type === type : (token.type === 'OP_LOGIC' || token.type === 'OP_MATH');

    if (typeMatch && values.includes(token.value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`${message} (at position ${token.start})`);
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

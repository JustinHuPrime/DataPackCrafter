import { DatapackDecl, Define, Expression, File, For, Id, If, Import, Let, Print } from "../ast/ast";
import Options from "../options";
import Token, { TokenType } from "../ast/token";
import Lexer from "./lexer";

export default class Parser {
  private filename: string;
  private lexer: Lexer;
  options: Options;

  constructor(filename: string, options: Options) {
    this.filename = filename;
    this.options = options;
    this.lexer = new Lexer(filename);
  }
  private parseDatapackDeclaration (): DatapackDecl {
    const datapackToken: Token = this.lexer.lexRegular();
    this.expect(datapackToken, TokenType.LITERAL, "datapack");

    const id = this.parseId();

    return new DatapackDecl(datapackToken, id);
  }

  private parseId(): Id {
    const token: Token = this.lexer.lexRegular();
    this.expect(token, TokenType.ID);

    return new Id(token);
  }

  private parseImport() : Import  {
    const keyword  = this.lexer.lexRegular();
    // has to be an import
    this.expect(keyword, TokenType.LITERAL, "import");

    const target = this.parseExpression();

    return new Import(keyword, target);
  }

  private parseLogicalExpression(): Expression {
    throw new Error("not implemented yet");
  }

  private parseDefine(): Expression {
    const keyword = this.lexer.lexRegular();
    let id: Id | null = null;
    const args: Id[] = [];

    this.expect(keyword, TokenType.LITERAL, "import");

    const identifierToken = this.lexer.lexRegular();
    this.lexer.unlex(identifierToken);

    if (identifierToken.type === TokenType.ID) {
      id = this.parseId();
      this.lexer.unlex(identifierToken);
    }

    const openParan = this.lexer.lexRegular();

    this.expect(openParan, TokenType.LITERAL, "(");

    const arg1 = this.parseId();
    args.push(arg1);

    let current = this.lexer.lexRegular();

    while (current.content !== ")") {
      const { type, content, span } = current;
      const { start } = span;
      const { line, character } = start;

      switch (type) {
        case TokenType.ID:
          this.lexer.unlex(current);
          const id = this.parseId();
          args.push(id);
          break;
        case TokenType.LITERAL:
          this.expect(current, TokenType.LITERAL, ",");
          break;
        default:
          throw new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
          break;
      }
      current = this.lexer.lexRegular();
    }

    const body = this.parseExpression();

    return new Define(keyword, id, args, body);
  }

  private parseLet(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "let");

    const ids: Id[] = [];
    const values: Expression[] = [];

    const id0 = this.lexer.lexRegular();
    this.expect(keyword, TokenType.ID);

    const eq1 = this.lexer.lexRegular();
    this.expect(eq1, TokenType.LITERAL, "=");

    const v1 = this.parseExpression();

    ids.push(new Id(id0));
    values.push(v1);

    let current = this.lexer.lexRegular();

    while (current.content === ',') {
      current = this.lexer.lexRegular();
      this.expect(current, TokenType.ID);

      const id = new Id(current);

      current = this.lexer.lexRegular();
      this.expect(current, TokenType.LITERAL, "=");

      const value = this.parseExpression();

      ids.push(id);
      values.push(value);

      this.lexer.lexRegular();
    }

    this.lexer.unlex(current);

    const body = this.parseExpression();

    return new Let(keyword, ids, values, body);
  }

  private parseIf(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "if");

    const predicate = this.parseExpression();

    const thenToken = this.lexer.lexRegular();
    this.expect(thenToken, TokenType.LITERAL, "then");

    const consequent = this.parseExpression();

    const elseToken = this.lexer.lexRegular();
    this.expect(elseToken, TokenType.LITERAL, "else");

    const alternative = this.parseExpression();

    return new If(keyword, predicate, consequent, alternative);
  }

  private parseFor(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "for");

    const id = this.parseId();

    const inToken = this.lexer.lexRegular();
    this.expect(inToken, TokenType.LITERAL, "in");

    const iterable = this.parseExpression();
    const body = this.parseExpression();

    return new For(keyword, id, iterable, body);
  }

  private parsePrint(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "print");

    const expression = this.parseExpression();

    return new Print(keyword, expression);
  }

  // @ts-ignore
  private parseExpression() : Expression {
    const next = this.lexer.lexRegular();
    this.lexer.unlex(next);
    switch (next.type) {
      case TokenType.LITERAL: {
        switch (next.content) {
          case "import": {
            return this.parseImport();
          }
          case "define": {
            return this.parseDefine();
          }
          case "let": {
            return this.parseLet();
          }
          case "if": {
            return this.parseIf();
          }
          case "for": {
            return this.parseFor();
          }
          case "print": {
            return this.parsePrint();
          }
        }
        break;
      }
      default: {
        return this.parseLogicalExpression();
      }
    }
  }

  private expect(token: Token, tokenType: TokenType, value?: string): void {
    const { type, content, span } = token;
    const { start } = span;
    const { line, character } = start;

    if (type !== tokenType || (value && content !== value)) {
      throw new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
    }
  }

  parse(): File {
    const expressions: Expression[] = [];
    const datapackDecl: DatapackDecl = this.parseDatapackDeclaration();

    const currentToken: Token = this.lexer.lexRegular();
    while (currentToken.type !== TokenType.EOF) {
      this.lexer.unlex(currentToken);
      expressions.push(this.parseExpression());
    }

    return new File(datapackDecl, expressions);
  }
}


export class ParserError extends Error {}

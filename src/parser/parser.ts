import {
  Advancement,
  ASTNumber,
  ASTString, Begin,
  DatapackDecl,
  Define,
  Expression,
  False,
  File,
  For,
  Id,
  If,
  Import,
  Let, List, MCFunction, On,
  Print,
  True,
} from "../ast/ast";
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

  private throwUnexpectedCharacterError(token: Token): void {
    const { content, span } = token;
    const { start } = span;
    const { line, character } = start;
    throw new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
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

  private parseTrue(): True {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "true");

    return new True(keyword);
  }

  private parseFalse(): False {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "false");

    return new False(keyword);
  }

  private parseString(): ASTString {
    const leftQuote = this.lexer.lexRegular();
    this.expect(leftQuote, TokenType.LITERAL, '"');

    const components: (string | Expression)[] = [];

    let stringBuilder = "";

    let current = this.lexer.lexString();

    while (current.content !== '"') {
      if (current.type === TokenType.STRING_CHAR) {
        stringBuilder += current.content;
      } else if (current.type === TokenType.LITERAL && current.content === "{") {
        components.push(stringBuilder);
        stringBuilder = "";
        components.push(this.parseExpression());
      } else if (current.type === TokenType.EOF) {
        this.throwUnexpectedCharacterError(current);
      }

      current = this.lexer.lexString();
    }

    if (stringBuilder.length > 0) {
      components.push(stringBuilder);
    }

    return new ASTString(leftQuote, components, current);
  }

  private parseNumber(): ASTNumber {
    const token = this.lexer.lexRegular();
    this.expect(token, TokenType.NUMBER);

    return new ASTNumber(token);
  }

  private parseFunction(): MCFunction {
    throw new Error("not implemented yet");
  }

  private parseAdvancement(): Advancement {
    throw new Error("not implemented yet");
  }

  private parseOn(): On {
    throw new Error("not implemented yet");
  }

  private parseBegin(): Begin {
    throw new Error("not implemented yet");
  }

  private parseList(): List {
    throw new Error("not implemented yet");
  }

  // TODO： Remove
  // @ts-ignore
  private parsePrimaryExpression(): Expression {
    const token = this.lexer.lexRegular();
    this.lexer.unlex(token);
    switch (token.type) {
      case TokenType.LITERAL:
        switch (token.content) {
          case "(":
            break;
          case "[":
            return this.parseList();
            break;
          case "{":
            return this.parseBegin();
            break;
          case "on":
            return this.parseOn();
            break;
          case "advancement":
            return this.parseAdvancement();
            break;
          case "function":
            return this.parseFunction();
          case '"':
            return this.parseString();
          case "true":
            return this.parseTrue();
          case "false":
            return this.parseFalse();
          default:
            this.throwUnexpectedCharacterError(token);
            break;
        }
          break;
      case TokenType.ID:
        return this.parseId();
      case TokenType.NUMBER:
        return this.parseNumber();
      default:
        this.throwUnexpectedCharacterError(token);
        break;
    }
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
    }

    const openParan = this.lexer.lexRegular();

    this.expect(openParan, TokenType.LITERAL, "(");

    let current = this.lexer.lexRegular();
    let idFlag = false;
    while (current.content !== ")") {
      const { type } = current;
      switch (type) {
        case TokenType.ID:
          this.lexer.unlex(current);
          const id = this.parseId();
          args.push(id);
          idFlag = true;
          break;
        case TokenType.LITERAL:
          if (idFlag) {
            this.expect(current, TokenType.LITERAL, ",");
            idFlag = false;
          } else {
            this.throwUnexpectedCharacterError(current);
          }
          break;
        default:
          this.throwUnexpectedCharacterError(current);
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

  // TODO: Remove
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

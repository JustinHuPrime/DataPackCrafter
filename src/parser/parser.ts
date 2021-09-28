import { DatapackDecl, Expression, File, Id, Import } from "../ast/ast";
import Options from "../options";
import Token, { TokenType } from "../ast/token";
import Lexer from "./lexer";

export default class Parser {
  filename: string;
  lexer: Lexer;
  options: Options;

  constructor(filename: string, options: Options) {
    this.filename = filename;
    this.options = options;
    this.lexer = new Lexer(filename);
  }
  private parseDatapackDeclaration (lexer: Lexer): DatapackDecl {
    const datapackToken: Token = lexer.lexRegular();
    this.expect(datapackToken, TokenType.LITERAL, "datapack");

    const id = lexer.lexRegular();
    this.expect(id, TokenType.ID);

    return new DatapackDecl(datapackToken, new Id(id));
  }

  private parseExpression(lexer: Lexer) : Expression {
    const next = lexer.lexRegular();
    lexer.unlex(next);
    switch (next.type) {
      case TokenType.LITERAL: {
        switch (next.content) {
          case "import": {
            return this.parseImport(lexer);
          }
          case "define": {
            return this.parseDefine(lexer);
          }
          case "let": {
            return this.parseLet(lexer);
          }
          case "if": {
            return this.parseIf(lexer);
          }
          case "for": {
            return this.parseFor(lexer);
          }
          case "print": {
            return this.parsePrint(lexer);
          }
        }
        break;
      }
      default: {
        return this.parseLogicalExpression(lexer);
      }
    }
  }

  private expect(token: Token, tokenType: TokenType, value?: string): void {
    const { type, content, span } = token;
    const { start } = span;
    const { line, character } = start;

    if (type !== tokenType || (value && content !== "value")) {
      throw new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
    }
  }

  private parseImport(lexer: Lexer) : Import  {
    const keyword  = lexer.lexRegular();
    // has to be an import
    this.expect(keyword, TokenType.LITERAL, "import");

    const target = this.parseExpression(lexer);

    return new Import(keyword, target);
  }

  private parseLogicalExpression(lexer : Lexer): Expression {

  }

  parse(filename: string, options: Options): File {
    const lexer = new Lexer(filename);
    const expressions: Expression[] = [];
    const datapackDecl: DatapackDecl = this.parseDatapackDeclaration(lexer);

    const currentToken: Token = lexer.lexRegular();
    while (currentToken.type !== TokenType.EOF) {
      lexer.unlex(currentToken);
      expressions.push(this.parseExpression(lexer));
    }

    return new File(datapackDecl, expressions);
  }
}


export class ParserError extends Error {}
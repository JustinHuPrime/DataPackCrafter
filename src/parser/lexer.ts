import Token, { KEYWORDS, TokenType } from "../ast/token";
import * as fs from "fs";
import Span, { Location } from "../ast/span";
import { ParserError } from "./parser";

export default class Lexer {
  file: string;
  line: number;
  character: number;
  filename: string;

  constructor(filename: string) {
    this.filename = filename;
    try {
      this.file = fs.readFileSync(filename, "utf8");
    } catch (e) {
      throw new ParserError(this.filename, "could not open file", null, null);
    }
    this.line = 1;
    this.character = 1;
  }

  removeWhiteSpace(): void {
    if (this.file.startsWith(" ") || this.file.startsWith("\t")) {
      this.character += 1;
      this.file = this.file.substr(1);
      this.removeWhiteSpace();
    } else if (this.file.startsWith("\n")) {
      this.line += 1;
      this.character = 1;
      this.file = this.file.substr(1);
      this.removeWhiteSpace();
    } else if (this.file.startsWith("#")) {
      this.line += 1;
      this.character = 1;

      const newLineIndex = this.file.indexOf("\n");
      this.file = newLineIndex !== -1 ? this.file.substr(newLineIndex + 1) : "";
      this.removeWhiteSpace();
    }
  }

  private lexToken(tokenString: string, type: TokenType): Token {
    const start: Location = new Location(this.line, this.character);
    const end: Location = new Location(
      this.line,
      this.character + tokenString.length,
    );

    this.character += tokenString.length;
    this.file = this.file.substr(tokenString.length);

    return new Token(type, new Span(start, end), tokenString);
  }

  private eof(): Token {
    const start: Location = new Location(this.line, this.character);
    const end: Location = new Location(this.line, this.character);
    return new Token(TokenType.EOF, new Span(start, end), "");
  }

  lexRegular(): Token {
    this.removeWhiteSpace();

    if (this.file === "") return this.eof();

    const matchIdToken = this.file.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);

    if (matchIdToken) {
      const tokenString = matchIdToken[0] as string;
      const tokenType = KEYWORDS.has(tokenString)
        ? TokenType.LITERAL
        : TokenType.ID;
      return this.lexToken(tokenString, tokenType);
    }
    const matchNumberToken = this.file.match(/^-?[0-9]+(\.[0-9]+)?/);

    if (matchNumberToken)
      return this.lexToken(matchNumberToken[0] as string, TokenType.NUMBER);

    const matchPunctuationToken = this.file.match(
      /^(==|&&|!=|<=|>=|<|>|\|\||\(|\)|=|,|{|}|%|\+|-|\*|\/|:|\[|]|")|!/,
    );

    if (matchPunctuationToken)
      return this.lexToken(
        matchPunctuationToken[0] as string,
        TokenType.LITERAL,
      );

    throw new ParserError(
      this.filename,
      `invalid character '${this.file[0]}'`,
      this.line,
      this.character,
    );
  }

  unlex(t: Token): void {
    this.file = t.content + this.file;
    this.character -= t.content.length;
  }

  lexString(): Token {
    if (this.file === "") return this.eof();

    const matchStringSingle = this.file.match(/^[^"\\{}]/);

    if (matchStringSingle)
      return this.lexToken(
        matchStringSingle[0] as string,
        TokenType.STRING_CHAR,
      );

    const matchStringEscape = this.file.match(/^(\\\\|\\"|\\{|\\})/);
    if (matchStringEscape) {
      const retval = this.lexToken(
        matchStringEscape[0] as string,
        TokenType.STRING_CHAR,
      );

      retval.content = retval.content[retval.content.length - 1] as string;
      return retval;
    }

    const matchPunctuation = this.file.match(/^(["{}])/);

    if (matchPunctuation)
      return this.lexToken(matchPunctuation[0] as string, TokenType.LITERAL);

    throw new ParserError(
      this.filename,
      `invalid character '${this.file[0]}'`,
      this.line,
      this.character,
    );
  }
}

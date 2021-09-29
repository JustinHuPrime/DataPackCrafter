import Token, { keywordArr, TokenType } from "../ast/token";
import * as fs from "fs";
import Span, { Location } from "../ast/span";

export default class Lexer {
  file: string;
  line: number;
  character: number;
  filename: string;
  literals: Set<string>;

  constructor(filename: string) {
    this.filename = filename;
    this.file = fs.readFileSync(filename, "utf8");
    this.line = 1;
    this.character = 1;
    this.literals = new Set(keywordArr);
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
      this.file = newLineIndex !== -1 ? this.file.substr(newLineIndex +  1) : "";
      this.removeWhiteSpace();
    } else {
      return;
    }
  }

  private lexToken(matcher: RegExpMatchArray, type: TokenType): Token {
    const tokenString = matcher[0] || ''; // TS likes to break things

    const start: Location = new Location(this.line, this.character);
    const end : Location = new Location(this.line, this.character + tokenString.length);

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

    if (this.file === "") {
      return this.eof();
    }

    const matchIdToken = this.file.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);

    if (matchIdToken && matchIdToken[0] && matchIdToken.index === 0) {
      const tokenString = matchIdToken[0];
      const tokenType = (this.literals.has(tokenString)) ? TokenType.LITERAL : TokenType.ID;
      return this.lexToken(matchIdToken, tokenType)
    }
    const matchNumberToken = this.file.match(/^-?[0-9]+(\.[0-9]+)?/);

    if (matchNumberToken && matchNumberToken[0] && matchNumberToken.index === 0) {
      return this.lexToken(matchNumberToken, TokenType.NUMBER);
    }

    const matchPunctuationToken = this.file.match(/^==|^&&|^!=|^<=|^>=|^\|\|$|&|\(|\)|=|,|{|}|%|\+|-|\/|:|\[|]|"/);

    if (matchPunctuationToken && matchPunctuationToken[0] && matchPunctuationToken.index === 0) {
      return this.lexToken(matchPunctuationToken, TokenType.LITERAL);
    }
    throw new LexerError(`${this.filename}: ${this.line}:${this.character}: error: invalid character '${this.file[0]}`);
  }

  unlex(t: Token): void {
    this.file = t.content + this.file;
    this.character -= t.content.length;
  }

  lexString(): Token {
    if (this.file === "") {
      return this.eof();
    }

    const matchStringToken = this.file.match(/[^"\\{}]|\\\\|\\"|\\{|\\}/);

    if (matchStringToken && matchStringToken[0]) {
      return this.lexToken(matchStringToken, TokenType.STRING_CHAR);
    }

    const matchPunctuation = this.file.match(/["\\{}]/);

    if (matchPunctuation && matchPunctuation[0]) {
      return this.lexToken(matchPunctuation, TokenType.LITERAL);
    }

    throw new LexerError(`${this.filename}: ${this.line}:${this.character}: error: invalid character '${this.file[0]}`);
  }
}

export class LexerError extends Error {}

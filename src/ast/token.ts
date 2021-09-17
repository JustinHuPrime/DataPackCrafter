import Span from "./span";

export enum TokenType {
  EOF,
  LITERAL, // keyword, punctuation, any string to match exactly
  ID,
  NUMBER,
  STRING_CHAR,
}

export default class Token {
  type: TokenType;
  span: Span;
  content: string;

  constructor(type: TokenType, span: Span, content: string) {
    this.type = type;
    this.span = span;
    this.content = content;
  }
}

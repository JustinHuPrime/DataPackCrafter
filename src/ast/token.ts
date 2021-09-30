import Span from "./span";

export const KEYWORDS = new Set([
  "datapack",
  "import",
  "define",
  "let",
  "if",
  "then",
  "else",
  "for",
  "in",
  "print",
  "on",
  "advancement",
  "function",
  "true",
  "false",
  "grant",
  "revoke",
  "load",
  "tick",
  "consume_item",
  "inventory_changed",
  "item",
  "tag",
  "title",
  "icon",
  "description",
  "parent",
]);

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

import { SinonStub } from "sinon";
import Lexer from "../../src/parser/lexer";
import Token, { keywordArr, TokenType } from "../../src/ast/token";
import Span, { Location } from "../../src/ast/span";

const assert = require("assert");
const fs = require("fs");
const sinon = require("sinon");

describe("lexer", () => {

  let lexer: Lexer;
  let readFileSync: SinonStub;

  const stubReadFileSync = (response: string) => {
    readFileSync = sinon.stub(fs, "readFileSync").returns(response);
  }
  it('should lex EOF correctly', () => {
    stubReadFileSync("");
    lexer = new Lexer("");

    assert.deepEqual(lexer.lexRegular(), new Token(TokenType.EOF, new Span(new Location(1,1), new Location(1,1)), ""));
  });

  it('should lex ID correctly', () => {
    stubReadFileSync("hello");
    lexer = new Lexer("");

    assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,1), new Location(1,6)), "hello"));
  })

  it('should parse number correctly', () => {
    const token = "5.2551"
    stubReadFileSync(token);
    lexer = new Lexer("");

    assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,1), new Location(1,token.length)), token));
  })

  it('should lex keywords correctly', () => {
    for (const keyword of keywordArr) {
      stubReadFileSync(keyword);
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,1), new Location(1,keyword.length)), keyword));
    }
  })

  afterEach(() => {
    readFileSync.restore();
  });
});

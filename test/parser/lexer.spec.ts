import Lexer, { LexerError } from "../../src/parser/lexer";
import Token, { keywordArr, TokenType } from "../../src/ast/token";
import Span, { Location } from "../../src/ast/span";

const assert = require("assert");
const fs = require("fs");
const sinon = require("sinon");

describe("lexer", () => {
  let lexer: Lexer;

  const stubReadFileSync = (response: string) => {
     sinon.stub(fs, "readFileSync").returns(response);
  }

  describe('lexString', () => {
    it("should lex non-reserved character as string", () => {
      const token = "k";
      stubReadFileSync(token);
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexString(), new Token(TokenType.STRING_CHAR, new Span(new Location(1,1), new Location(1,2)), token));
    });

    it("should parse special strings as string", () => {
      const strings = ['\\\\', '\\"', '\\{', '\\}'];

      for (const s of strings) {
        stubReadFileSync(s);
        lexer = new Lexer("");

        assert.deepEqual(lexer.lexString(), new Token(TokenType.STRING_CHAR, new Span(new Location(1,1), new Location(1,s.length + 1)), s));

        sinon.restore();
      }
    })

    it("should lex reserved characters as literals", () => {
      const characters = ['"', '\\', '{', '}'];

      for (const character of characters) {
        stubReadFileSync(character);
        lexer = new Lexer("");

        assert.deepEqual(lexer.lexString(), new Token(TokenType.LITERAL, new Span(new Location(1,1), new Location(1,2)), character));

        sinon.restore();
      }
    })

    it("should lex EOF", () => {
      stubReadFileSync("");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexString(), new Token(TokenType.EOF, new Span(new Location(1,1), new Location(1,1)), ""));
    })

    it("should lex individual string characters", () => {
      const token = "jwtxrfa";
      stubReadFileSync(token);
      lexer = new Lexer("");

      for (let i = 0; i < token.length; i++) {
        assert.deepEqual(lexer.lexString(), new Token(TokenType.STRING_CHAR, new Span(new Location(1,i+1), new Location(1,i+2)), token.charAt(i)));
      }
    })
  })

  describe("unlex", () => {
    it("should add unlexed token back to front", () => {
      stubReadFileSync("define bird");
      lexer = new Lexer("");

      const token = lexer.lexRegular();

      assert.deepEqual(token, new Token(TokenType.LITERAL, new Span(new Location(1,1), new Location(1,7)), "define"));

      lexer.unlex(token);

      assert.deepEqual(lexer.lexRegular(), token);
    });
  })

  describe('lexRegular', () => {
    it('should lex EOF correctly', () => {
      stubReadFileSync("");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.EOF, new Span(new Location(1,1), new Location(1,1)), ""));
    });

    it('should lex ID correctly', () => {
      stubReadFileSync("hello");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,1), new Location(1,6)), "hello"));
    });

    it('should lex with newline', () => {
      stubReadFileSync("\n\nhello");
      lexer = new Lexer("");
      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(3,1), new Location(3,6)), "hello"));
    });

    it('should lex ID with space', () => {
      stubReadFileSync("   hello");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,4), new Location(1,9)), "hello"));
    });

    it('should lex token 1 line after comment', () => {
      stubReadFileSync("#this is a comment \nhello");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(2,1), new Location(2,6)), "hello"));
    });

    it('should lex EOF if comment is all there is', () => {
      stubReadFileSync("#this is a comment");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.EOF, new Span(new Location(2,1), new Location(2,1)), ""));
    })


    it('should lex numbers correctly', () => {
      const tokens = ["5.2551", "-2131.321", "5", "30.213", "0.232", "0", "37712", "1337", "-0", "-0.00"];

      for (const token of tokens) {
        stubReadFileSync(token);
        lexer = new Lexer("");

        assert.deepEqual(lexer.lexRegular(), new Token(TokenType.NUMBER, new Span(new Location(1,1), new Location(1,token.length + 1)), token));

        sinon.restore();
      }
    });

    it('should lex keywords correctly', () => {
      for (const keyword of keywordArr) {
        stubReadFileSync(keyword);
        lexer = new Lexer("");

        assert.deepEqual(lexer.lexRegular(), new Token(TokenType.LITERAL, new Span(new Location(1,1), new Location(1,keyword.length + 1)), keyword));

        sinon.restore();
      }
    });

    it('should lex punctuation tokens', () => {
      const tokens = ['==', '&&', '!=', '<=', '>=', '||', '&', '(', ')', '=', '{', '}', '%', '+', '-', '/', ':', '[', ']', '"'];

      for (const token of tokens) {
        stubReadFileSync(token);
        lexer = new Lexer("");

        assert.deepEqual(lexer.lexRegular(), new Token(TokenType.LITERAL, new Span(new Location(1,1), new Location(1,token.length + 1)), token));

        sinon.restore();
      }
    })

    it('should lex multiple tokens', () => {
      stubReadFileSync("datapack test");
      lexer = new Lexer("");

      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.LITERAL, new Span(new Location(1,1), new Location(1,9)), "datapack"));
      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.ID, new Span(new Location(1,10), new Location(1,14)), "test"));
      assert.deepEqual(lexer.lexRegular(), new Token(TokenType.EOF, new Span(new Location(1,14), new Location(1,14)), ""));
    });

    it('should throw error on invalid token parse', () => {
      stubReadFileSync("$");
      lexer = new Lexer("file.txt");

      assert.throws(() => { lexer.lexRegular() }, LexerError, "file.txt: 1:1: error: invalid character $");
    })
  })


  afterEach(() => {
    sinon.restore();
  });
});

import Lexer from "../../src/parser/lexer";
import Token, { KEYWORDS, TokenType } from "../../src/ast/token";
import Span, { Location } from "../../src/ast/span";
import { ParserError } from "../../src/parser/parser";

const assert = require("assert");
const fs = require("fs");
const sinon = require("sinon");

describe("lexer", () => {
  let lexer: Lexer;

  const setup = (response: string) => {
    sinon.stub(fs, "readFileSync").returns(response);
    lexer = new Lexer("");
    sinon.restore();
  };

  describe("lexString", () => {
    it("should lex non-reserved character as string", () => {
      const token = "k";
      setup(token);

      assert.deepEqual(
        lexer.lexString(),
        new Token(
          TokenType.STRING_CHAR,
          new Span(new Location(1, 1), new Location(1, 2)),
          token,
        ),
      );
    });

    it("should lex special strings as string", () => {
      const strings = ['\\"', "\\{", "\\}", "\\\\"];

      for (const s of strings) {
        setup(s);

        assert.deepEqual(
          lexer.lexString(),
          new Token(
            TokenType.STRING_CHAR,
            new Span(new Location(1, 1), new Location(1, s.length + 1)),
            s[1] as string,
          ),
        );
      }
    });

    it("should lex reserved characters as literals", () => {
      const characters = ['"', "{", "}"];

      for (const character of characters) {
        setup(character);

        assert.deepEqual(
          lexer.lexString(),
          new Token(
            TokenType.LITERAL,
            new Span(new Location(1, 1), new Location(1, 2)),
            character,
          ),
        );
      }
    });

    it("should lex EOF", () => {
      setup("");

      assert.deepEqual(
        lexer.lexString(),
        new Token(
          TokenType.EOF,
          new Span(new Location(1, 1), new Location(1, 1)),
          "",
        ),
      );
    });

    it("should lex individual string characters", () => {
      const token = "jwtxrfa";
      setup(token);

      for (let i = 0; i < token.length; i++) {
        assert.deepEqual(
          lexer.lexString(),
          new Token(
            TokenType.STRING_CHAR,
            new Span(new Location(1, i + 1), new Location(1, i + 2)),
            token.charAt(i),
          ),
        );
      }
    });
  });

  describe("unlex", () => {
    it("should add unlexed token back to front", () => {
      setup("define bird");

      const token = lexer.lexRegular();

      assert.deepEqual(
        token,
        new Token(
          TokenType.LITERAL,
          new Span(new Location(1, 1), new Location(1, 7)),
          "define",
        ),
      );

      lexer.unlex(token);

      assert.deepEqual(lexer.lexRegular(), token);
    });
  });

  describe("lexRegular", () => {
    it("should lex EOF correctly", () => {
      setup("");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.EOF,
          new Span(new Location(1, 1), new Location(1, 1)),
          "",
        ),
      );
    });

    it("should lex ID correctly", () => {
      setup("hello");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(1, 1), new Location(1, 6)),
          "hello",
        ),
      );
    });

    it("should lex with CRLF", () => {
      setup("\r\n\r\nhello");
      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(3, 1), new Location(3, 6)),
          "hello",
        ),
      );
    })

    it("should lex with newline", () => {
      setup("\n\nhello");
      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(3, 1), new Location(3, 6)),
          "hello",
        ),
      );
    });

    it("should lex ID with space", () => {
      setup("   hello");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(1, 4), new Location(1, 9)),
          "hello",
        ),
      );
    });

    it("should lex token 1 line after comment", () => {
      setup("#this is a comment \nhello");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(2, 1), new Location(2, 6)),
          "hello",
        ),
      );
    });

    it("should lex EOF if comment is all there is", () => {
      setup("#this is a comment");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.EOF,
          new Span(new Location(2, 1), new Location(2, 1)),
          "",
        ),
      );
    });

    it("should lex numbers correctly", () => {
      const tokens = [
        "5.2551",
        "-2131.321",
        "5",
        "30.213",
        "0.232",
        "0",
        "37712",
        "1337",
        "-0",
        "-0.00",
      ];

      for (const token of tokens) {
        setup(token);

        assert.deepEqual(
          lexer.lexRegular(),
          new Token(
            TokenType.NUMBER,
            new Span(new Location(1, 1), new Location(1, token.length + 1)),
            token,
          ),
        );
      }
    });

    it("should lex keywords correctly", () => {
      for (const keyword of KEYWORDS) {
        setup(keyword);

        assert.deepEqual(
          lexer.lexRegular(),
          new Token(
            TokenType.LITERAL,
            new Span(new Location(1, 1), new Location(1, keyword.length + 1)),
            keyword,
          ),
        );
      }
    });

    it("should lex punctuation tokens", () => {
      const tokens = [
        "==",
        "&&",
        "!=",
        "<=",
        ">=",
        "<",
        ">",
        "||",
        "(",
        ")",
        "=",
        "{",
        "}",
        "%",
        "+",
        "*",
        "-",
        "/",
        ":",
        "[",
        "]",
        "!",
        '"',
      ];

      for (const token of tokens) {
        setup(token);

        assert.deepEqual(
          lexer.lexRegular(),
          new Token(
            TokenType.LITERAL,
            new Span(new Location(1, 1), new Location(1, token.length + 1)),
            token,
          ),
        );
      }
    });

    it("should lex multiple tokens", () => {
      setup("datapack test");

      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.LITERAL,
          new Span(new Location(1, 1), new Location(1, 9)),
          "datapack",
        ),
      );
      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.ID,
          new Span(new Location(1, 10), new Location(1, 14)),
          "test",
        ),
      );
      assert.deepEqual(
        lexer.lexRegular(),
        new Token(
          TokenType.EOF,
          new Span(new Location(1, 14), new Location(1, 14)),
          "",
        ),
      );
    });

    it("should throw error on invalid token lex", () => {
      setup("$");

      assert.throws(
        () => {
          lexer.lexRegular();
        },
        ParserError,
        "file.txt: 1:1: error: invalid character $",
      );
    });
  });
});

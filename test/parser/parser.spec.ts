import Parser, { ParserError } from "../../src/parser/parser";
import Options from "../../src/options";
import { ASTString, Print } from "../../src/ast/ast";

const assert = require("assert");
const sinon = require("sinon");
const fs = require("fs");

describe("parse", () => {
  let parser: Parser;
  const dummyOptions: Options = { outputFile: "test.out" };

  const setup = (response: string) => {
    sinon.stub(fs, "readFileSync").returns(response);
    parser = new Parser("", dummyOptions);
    sinon.restore();
  };

  describe("parsePrint", () => {
    it("should parse printing string correctly (happy path)", () => {
      setup('datapack test \n print "test"');

      const file = parser.parse();

      const { expressions } = file;

      assert.equal(expressions.length, 1);
      assert.equal(expressions[0] instanceof Print, true);

      const print: Print = expressions[0] as Print;
      const { expression } = print;

      assert.equal(expression instanceof ASTString, true);

      const { components } = expression as ASTString;

      assert.equal(components.length, "test".length);
      for (let i = 0; i < "test".length; ++i)
        assert.equal(components[i], "test".charAt(i));
    });
  });

  describe("parseDatapack", () => {
    it("should parse datapack declaration - happy path", () => {
      setup("datapack test");

      const file = parser.parse();

      const { datapackDecl } = file;
      const { id } = datapackDecl;
      const { id: datapackId } = id;

      assert.deepEqual(datapackId, "test");
    });

    it("should throw if datapack declaration is invalid - EOF", () => {
      setup("datapack   ");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });

    it("should throw if datapack declaration is invalid - number", () => {
      setup("datapack 5.012");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });

    it("should throw if datapack declaration is invalid - literal", () => {
      setup("datapack datapack");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });
  });
});

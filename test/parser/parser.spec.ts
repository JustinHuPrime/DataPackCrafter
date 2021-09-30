import Parser, { ParserError } from "../../src/parser/parser";
import Options from "../../src/options";
import { ASTString, Print } from "../../src/ast/ast";

const assert = require("assert");
const sinon = require("sinon");
const fs = require("fs");

describe("parse", () => {

  // let parser: Parser;
  const dummyOptions: Options = { outputFile: "test.out" };

  const stubReadFileSync = (response: string) => {
    sinon.stub(fs, "readFileSync").returns(response);
  };

  afterEach(() => {
    sinon.restore();
  })

  describe("parsePrint", () => {
    it("should parse printing string correctly (happy path)", () => {
      stubReadFileSync('datapack test \n print "test"');

      const parser = new Parser("", dummyOptions);

      const file = parser.parse();

      const { expressions } = file;

      assert.equal(expressions.length, 1);
      assert.equal(expressions[0] instanceof Print, true);

      const print: Print = expressions[0] as Print;
      const { expression } = print;

      assert.equal(expression instanceof ASTString, true);

      const { components } = expression as ASTString;

      assert.equal(components.length, 1);
      assert.deepEqual(components[0], "test");
    })
  })

  describe("parseDatapack", () => {
    it("should parse datapack declaration - happy path", () => {
      stubReadFileSync("datapack test");
      const parser = new Parser("", dummyOptions);

      const file = parser.parse();

      const { datapackDecl } = file;
      const { id } = datapackDecl;
      const { id: datapackId } = id;

      assert.deepEqual(datapackId, "test");
    });

    it("should throw if datapack declaration is invalid - EOF", () => {
      stubReadFileSync("datapack   ");
      const parser = new Parser("file.txt", dummyOptions);

      assert.throws(() => { parser.parse() }, ParserError);
    })

    it("should throw if datapack declaration is invalid - number", () => {
      stubReadFileSync("datapack 5.012");
      const parser = new Parser("file.txt", dummyOptions);

      assert.throws(() => { parser.parse() }, ParserError);
    })

    it("should throw if datapack declaration is invalid - literal", () => {
      stubReadFileSync("datapack datapack");
      const parser = new Parser("file.txt", dummyOptions);

      assert.throws(() => { parser.parse() }, ParserError);
    })
  });
});

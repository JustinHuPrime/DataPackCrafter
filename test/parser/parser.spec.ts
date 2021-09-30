import Parser, { ParserError } from "../../src/parser/parser";
import Options from "../../src/options";

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

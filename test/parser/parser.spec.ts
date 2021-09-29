import Parser from "../../src/parser/parser";
import Options from "../../src/options";
// import { File } from "../../src/ast/ast";

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

      console.log(parser.parse());
    })
  });
});

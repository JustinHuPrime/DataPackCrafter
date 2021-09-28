import parse from "../../src/parser/parser";
// import { DatapackDecl } from "../../src/ast/ast";
//
// const assert = require("assert");
const sinon = require("sinon");
const fs = require("fs");

describe("parse", () => {

  const stubReadFileSync = (response: string) => {
    sinon.stub(fs, "readFileSync").returns(response);
  };

  describe("parseDatapack", () => {
    it("should parse datapack declaration - happy path", () => {
      stubReadFileSync("datapack test");

      const file = parse("", { outputFile: ""});


      console.log(file);

    })
  });
});

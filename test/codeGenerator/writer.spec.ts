import { SinonStub } from "sinon";

const assert = require("assert");
const fs = require("fs");
const sinon = require("sinon");

import { AdvancementValue, ConsumeItem, FunctionValue, ItemMatcher, Trigger } from "../../src/codeGenerator/store";
import { Writer } from "../../src/codeGenerator/writer";

describe("writer", () => {

  let mkdirSync: SinonStub;
  let writeFileSync: SinonStub;

  beforeEach(() => {
    mkdirSync = sinon.stub(fs, "mkdirSync").returns({});
    writeFileSync = sinon.stub(fs, "writeFileSync").returns({});
  });

  afterEach(() => {
    mkdirSync.restore();
    writeFileSync.restore();
  });

  describe("FunctionValueWriter", () => {
    it("should write minecraft function", () => {
      const functionValue: FunctionValue = FunctionValue.regular("test_function", ["this", "is", "sparta"]);
      const writer: Writer = functionValue.getWriter("data/sparta/functions");

      writer.write();

      assert.ok(mkdirSync.calledOnceWith("data/sparta/functions"));
      assert.ok(writeFileSync.calledOnceWith("data/sparta/functions/test_function.mcfunction"));
    });
  });

  describe("AdvancementValueWriter", () => {
    it("should write advancement", () => {
      const triggers: Trigger[] = [new ConsumeItem(new ItemMatcher("minecraft:iron_ingot"))];
      const advancementValue: AdvancementValue = new AdvancementValue(
        "testName",
        "this is a test advancement",
        "minecraft:iron_ingot",
        "blah",
        "this is a test description",
        "advancement before this",
        "test.mcfunction",
        triggers,
      );
      const writer: Writer = advancementValue.getWriter("data/oh_man/advancements");

      writer.write();

      assert.ok(mkdirSync.calledOnceWith("data/oh_man/advancements"));
      assert.ok(writeFileSync.calledOnceWith("data/oh_man/advancements/testName.json"));
    });
  });
});
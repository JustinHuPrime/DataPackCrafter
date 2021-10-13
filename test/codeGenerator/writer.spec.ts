import { SinonStub } from "sinon";

const assert = require("assert");
const fs = require("fs");
const sinon = require("sinon");

import STORE, {
  AdvancementValue,
  ConsumeItem,
  FunctionValue,
  ItemMatcher,
  Trigger,
} from "../../src/codeGenerator/store";
import { Writer, writeStore } from "../../src/codeGenerator/writer";
import { Archiver } from "archiver";

const archiver = require("archiver");

describe("writer", () => {
  let archive: Archiver;
  let append: SinonStub;
  let pipe: SinonStub;
  let finalize: SinonStub;
  let createWriteStream: SinonStub;

  beforeEach(() => {
    archive = archiver("zip");
    append = sinon.stub(archive, "append").returns({});
    pipe = sinon.stub(archive, "pipe").returns({});
    finalize = sinon.stub(archive, "finalize").returns({});
    createWriteStream = sinon.stub(fs, "createWriteStream").returns({
      on: () => {
        return;
      },
    });
  });

  afterEach(() => {
    append.restore();
    pipe.restore();
    finalize.restore();
    createWriteStream.restore();
  });

  describe("writeStore", () => {
    it("should write store with load function tag", async () => {
      const namespace = "blah";
      const functionValue: FunctionValue = FunctionValue.onLoad(
        "function_value",
        ["test", "this"],
      );
      const functionValue1: FunctionValue = FunctionValue.onLoad(
        "function_value1",
        ["test", "this"],
      );
      const triggers: Trigger[] = [
        new ConsumeItem(new ItemMatcher("minecraft:iron_ingot")),
      ];
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

      STORE.set("1", functionValue);
      STORE.set("2", advancementValue);
      STORE.set("3", functionValue1);

      await writeStore(namespace, "ok.zip", archive);

      assert.ok(append.calledWith(sinon.match.any, { name: "pack.mcmeta" }));
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/advancements/testName.json`,
        }),
      );
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/functions/function_value.mcfunction`,
        }),
      );
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/functions/function_value1.mcfunction`,
        }),
      );
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/minecraft/tags/functions/load.json`,
        }),
      );
      assert.ok(createWriteStream.calledOnceWith("ok.zip"));
    });

    it("should write store without load function tag if none exist", async () => {
      const namespace = "blah";
      const functionValue: FunctionValue = FunctionValue.regular(
        "function_value",
        ["test", "this"],
      );
      const functionValue1: FunctionValue = FunctionValue.regular(
        "function_value1",
        ["test", "this"],
      );
      const triggers: Trigger[] = [
        new ConsumeItem(new ItemMatcher("minecraft:iron_ingot")),
      ];
      const advancementValue: AdvancementValue = new AdvancementValue(
        "testName3",
        "this is a test advancement",
        "minecraft:iron_ingot",
        "blah",
        "this is a test description",
        "advancement before this",
        "test.mcfunction",
        triggers,
      );

      STORE.set("1", functionValue);
      STORE.set("2", advancementValue);
      STORE.set("3", functionValue1);

      await writeStore(namespace, "ok.zip", archive);

      assert.ok(append.calledWith(sinon.match.any, { name: "pack.mcmeta" }));
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/advancements/testName3.json`,
        }),
      );
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/functions/function_value.mcfunction`,
        }),
      );
      assert.ok(
        append.calledWith(sinon.match.any, {
          name: `data/${namespace}/functions/function_value1.mcfunction`,
        }),
      );
      assert.ok(createWriteStream.calledOnceWith("ok.zip"));
    });
  });

  describe("FunctionValueWriter", () => {
    it("should write minecraft function", () => {
      const functionValue: FunctionValue = FunctionValue.regular(
        "test_function",
        ["this", "is", "sparta"],
      );
      const writer: Writer = functionValue.getWriter("sparta");

      writer.write(archive);

      assert.ok(
        append.calledOnceWith(sinon.match.any, {
          name: "data/sparta/functions/test_function.mcfunction",
        }),
      );
    });
  });

  describe("AdvancementValueWriter", () => {
    it("should write advancement", () => {
      const triggers: Trigger[] = [
        new ConsumeItem(new ItemMatcher("minecraft:iron_ingot")),
      ];
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
      const writer: Writer = advancementValue.getWriter("oh_man");

      writer.write(archive);

      assert.ok(
        append.calledOnceWith(sinon.match.any, {
          name: "data/oh_man/advancements/testName.json",
        }),
      );
    });
  });
});

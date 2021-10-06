const assert = require("assert");

import {
  AdvancementValue,
  ConsumeItem, FunctionValue,
  InventoryChanged,
  ItemMatcher, LoadFunctionTagValue, Raw,
  TagMatcher, Tick,
  Trigger,
} from "../../src/codeGenerator/store";

describe("store", () => {

  describe("serialize", () => {

    describe("FunctionValue", () => {
      it("should serialize commands if commands exist", () => {
        const functionValue: FunctionValue = FunctionValue.regular("function value", ["this", "is", "sparta"]);

        const serialized: any = functionValue.serialize();

        assert.equal(serialized, "this\nis\nsparta");
      });

      it("should serialize commands if commands are empty", () => {
        const functionValue: FunctionValue = FunctionValue.regular("function value", []);

        const serialized: any = functionValue.serialize();

        assert.equal(serialized, "");
      });
    });

    describe("AdvancementValue", () => {
      it("should serialize all members if present", () => {
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

        const serialized: any = advancementValue.serialize();

        assert.deepEqual(serialized, {
          display: {
            icon: {
              item: "minecraft:iron_ingot",
              nbt: "blah",
            },
            title: "this is a test advancement",
            description: "this is a test description",
          },
          criteria: {
            trigger_0: {
              trigger: "minecraft:consume_item",
              conditions: {
                item: {
                  items: ["minecraft:iron_ingot"],
                },
              },
            },
          },
          parent: "advancement before this",
          rewards: {
            function: "test.mcfunction",
          },
        });
      });

      it("should not serialize display if title or description are not present", () => {
        const triggers: Trigger[] = [new ConsumeItem(new ItemMatcher("minecraft:iron_ingot"))];

        const advancementValue: AdvancementValue = new AdvancementValue(
          "testName",
          "this is a test advancement",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          triggers,
        );

        const serialized: any = advancementValue.serialize();

        assert.deepEqual(serialized, {
          criteria: {
            trigger_0: {
              trigger: "minecraft:consume_item",
              conditions: {
                item: {
                  items: ["minecraft:iron_ingot"],
                },
              },
            },
          },
        });
      });

      it("should not serialize icon if item or nbt are not present", () => {
        const triggers: Trigger[] = [new ConsumeItem(new ItemMatcher("minecraft:iron_ingot"))];

        const advancementValue: AdvancementValue = new AdvancementValue(
          "testName",
          "title",
          "icon",
          "nbt",
          "description",
          undefined,
          undefined,
          triggers,
        );

        const serialized: any = advancementValue.serialize();

        assert.deepEqual(serialized, {
          display: {
            icon: {
              item: "icon",
              nbt: "nbt",
            },
            description: "description",
            title: "title",
          },
          criteria: {
            trigger_0: {
              trigger: "minecraft:consume_item",
              conditions: {
                item: {
                  items: ["minecraft:iron_ingot"],
                },
              },
            },
          },
        });
      });

      it("should serialize impossible trigger if no triggers are present", () => {
        const advancementValue: AdvancementValue = new AdvancementValue(
          "testName",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [],
        );

        const serialized: any = advancementValue.serialize();

        assert.deepEqual(serialized, {
          criteria: {
            emptyTrigger: {
              trigger: "minecraft:impossible",
            },
          },
        });
      });
    });

    describe("LoadFunctionTagValue", () => {
      it("should serialize all functionValues passed", () => {
        const functionValue1: FunctionValue = FunctionValue.regular("f1", ["this", "is", "sparta"]);
        const functionValue2: FunctionValue = FunctionValue.regular("f2", ["this", "is", "sparta"]);
        const functionValue3: FunctionValue = FunctionValue.regular("f3", ["this", "is", "sparta"]);
        const loadFunctionTagValue: LoadFunctionTagValue = new LoadFunctionTagValue("test", [functionValue1, functionValue2, functionValue3]);

        const serialized: any = loadFunctionTagValue.serialize();

        assert.deepEqual(serialized, {
          values: ["test:f1", "test:f2", "test:f3"],
        });
      });

      it("should serialize empty functionValues passed", () => {
        const loadFunctionTagValue: LoadFunctionTagValue = new LoadFunctionTagValue("test", []);

        const serialized: any = loadFunctionTagValue.serialize();

        assert.deepEqual(serialized, {
          values: [],
        });
      });
    });

    describe("Trigger", () => {
      it("should serialize InventoryChanged trigger", () => {
        const inventoryChanged: InventoryChanged = new InventoryChanged(new TagMatcher("tag"));

        const serialized: any = inventoryChanged.serialize();

        assert.deepEqual(serialized, {
          trigger: "minecraft:inventory_changed",
          conditions: {
            items: [
              { items: ["tag"] },
            ],
          },
        });
      });

      it("should serialize ConsumeItem trigger", () => {
        const consumeItem: ConsumeItem = new ConsumeItem(new ItemMatcher("minecraft:cooked_chicken"));

        const serialized: any = consumeItem.serialize();

        assert.deepEqual(serialized, {
          trigger: "minecraft:consume_item",
          conditions: {
            item: {
              items: ["minecraft:cooked_chicken"],
            },
          },
        });
      });

      it("should serialize Tick Trigger", () => {
        const tick: Tick = new Tick();

        const serialized: any = tick.serialize();

        assert.deepEqual(serialized, {
          trigger: "minecraft:tick",
        });
      });

      it("should serialize Raw trigger", () => {
        const raw: Raw = new Raw("thistrigger");

        const serialized: any = raw.serialize();

        assert.deepEqual(serialized, {
          trigger: "thistrigger",
        });
      });
    });
  });
});
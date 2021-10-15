import {
  AdvancementValueWriter,
  FunctionValueWriter,
  LoadFunctionTagValueWriter,
  Serializable,
  Writeable,
  Writer,
} from "./writer";

const STORE: Map<string, FunctionValue | AdvancementValue> = new Map();
export default STORE;

export class FunctionValue implements Serializable, Writeable {
  name: string;
  commands: string[];
  tag: string | undefined;

  static LOAD = "load";

  constructor(name: string, commands: string[], tag: string | undefined) {
    this.name = name;
    this.commands = commands;
    this.tag = tag;
  }

  static regular(name: string, commands: string[]) {
    return new FunctionValue(name, commands, undefined);
  }

  static onLoad(name: string, commands: string[]) {
    return new FunctionValue(name, commands, FunctionValue.LOAD);
  }

  public isLoadFunction(): boolean {
    return this.tag === FunctionValue.LOAD;
  }

  public serialize(): any {
    return this.commands.join("\n");
  }

  public getWriter(namespace: string): Writer {
    return new FunctionValueWriter(namespace, this);
  }
}

export class AdvancementValue implements Serializable, Writeable {
  name: string;
  title: string | undefined;
  iconItem: string | undefined;
  iconNbt: string | undefined;
  description: string | undefined;
  parent: string | undefined;
  rewardFunction: string | undefined;
  triggers: Trigger[];

  constructor(
    name: string,
    title: string | undefined,
    iconItem: string | undefined,
    iconNbt: string | undefined,
    description: string | undefined,
    parent: string | undefined,
    rewardFunction: string | undefined,
    triggers: Trigger[],
  ) {
    this.name = name;
    this.title = title;
    this.iconItem = iconItem;
    this.iconNbt = iconNbt;
    this.description = description;
    this.parent = parent;
    this.rewardFunction = rewardFunction;
    this.triggers = triggers;
  }

  private serializeDisplay(): any {
    if (!this.title || !this.description) {
      return {};
    }

    let serialized: any = {};
    serialized.title = this.title;
    serialized.description = this.description;

    if (this.iconItem) {
      // NBT is optional
      serialized.icon = {
        item: this.iconItem,
        nbt: this.iconNbt,
      };
    }

    return { display: serialized };
  }

  private serializeParent(): any {
    if (!this.parent) {
      return {};
    }

    return { parent: this.parent };
  }

  private serializeCriteriaAndRequirements(): any {
    if (!this.triggers || this.triggers.length <= 0) {
      return {
        criteria: {
          emptyTrigger: {
            trigger: "minecraft:impossible",
          },
        },
      };
    }

    let serialized: any = {};
    let requirements: string[] = [];
    let result: { [key: string]: any } = { criteria: serialized };

    for (let i = 0; i < this.triggers.length; i++) {
      const criteriaName = `trigger_${i}`;
      serialized[criteriaName] = this.triggers[i]?.serialize();
      requirements.push(criteriaName);
    }

    if (requirements.length > 1) {
      result["requirements"] = [requirements]
    }

    return result;
  }

  private serializeRewards(): any {
    if (!this.rewardFunction) {
      return {};
    }

    return { rewards: { function: this.rewardFunction } };
  }

  public serialize(): any {
    return {
      ...this.serializeDisplay(),
      ...this.serializeParent(),
      ...this.serializeCriteriaAndRequirements(),
      ...this.serializeRewards(),
    };
  }

  public getWriter(namespace: string): Writer {
    return new AdvancementValueWriter(namespace, this);
  }
}

export class LoadFunctionTagValue implements Serializable, Writeable {
  namespace: string;
  functionValues: FunctionValue[];

  constructor(namespace: string, functionValues: FunctionValue[]) {
    this.namespace = namespace;
    this.functionValues = functionValues;
  }

  public serialize(): any {
    return {
      values: this.functionValues.map(
        (functionValue: FunctionValue) =>
          `${this.namespace}:${functionValue.name}`,
      ),
    };
  }

  public getWriter(): Writer {
    return new LoadFunctionTagValueWriter(this);
  }
}

export abstract class Trigger implements Serializable {
  public abstract serialize(): any;
}

export class Tick extends Trigger {
  public serialize(): any {
    return {
      trigger: "minecraft:tick",
    };
  }
}

export class ConsumeItem extends Trigger {
  item: ItemSpec | null;

  constructor(item: ItemSpec | null) {
    super();
    this.item = item;
  }

  public serialize(): any {
    let result: { [key: string]: any } = {
      trigger: "minecraft:consume_item",
    };
    if (this.item) {
      result["conditions"] = {
        item: {
          items: [this.item.getIdentifier()],
        },
      };
    }
    return result;
  }
}

export class InventoryChanged extends Trigger {
  item: ItemSpec | null;

  constructor(item: ItemSpec | null) {
    super();
    this.item = item;
  }

  public serialize(): any {
    let result: { [key: string]: any } = {
      trigger: "minecraft:inventory_changed",
    };
    if (this.item) {
      result["conditions"] = {
        items: [
          {
            items: [this.item.getIdentifier()],
          },
        ],
      };
    }
    return result;
  }
}

export class Raw extends Trigger {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  public serialize(): any {
    return {
      trigger: this.name,
    };
  }
}

export abstract class ItemSpec {
  public abstract getIdentifier(): string;
}

export class ItemMatcher extends ItemSpec {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  public getIdentifier(): string {
    return this.name;
  }
}

export class TagMatcher extends ItemSpec {
  tag: string;

  constructor(tag: string) {
    super();
    this.tag = tag;
  }

  public getIdentifier(): string {
    return this.tag;
  }
}

import { AdvancementValueWriter, FunctionValueWriter, Serializable, Writeable, Writer } from "./writer";

const STORE: Map<string, FunctionValue | AdvancementValue> = new Map();
export default STORE;

export class FunctionValue implements Serializable, Writeable {
  name: string;
  commands: string[];
  tag: string | undefined;

  constructor(name: string, commands: string[], tag: string | undefined) {
    this.name = name;
    this.commands = commands;
    this.tag = tag;
  }

  static regular(name: string, commands: string[]) {
    return new FunctionValue(name, commands, undefined);
  }

  static onTick(name: string, commands: string[]) {
    return new FunctionValue(name, commands, "tick");
  }

  static onLoad(name: string, commands: string[]) {
    return new FunctionValue(name, commands, "load");
  }

  public serialize(): any {
    return this.commands.join("\n");
  }

  public getWriter(path: string): Writer {
    return new FunctionValueWriter(path, this);
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

    if (this.iconItem && this.iconNbt) {
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

  private serializeCriteria(): any {
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
    for (let i = 0; i < this.triggers.length; i++) {
      serialized[`trigger_${i}`] = this.triggers[i]?.serialize();
    }

    return { criteria: serialized };
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
      ...this.serializeCriteria(),
      ...this.serializeRewards(),
    };
  }

  public getWriter(path: string): Writer {
    return new AdvancementValueWriter(path, this);
  }
}

export abstract class Trigger implements Serializable {
  public abstract serialize(): any;
}


export class ConsumeItem extends Trigger {
  item: ItemSpec | null;

  constructor(item: ItemSpec | null) {
    super();
    this.item = item;
  }

  public serialize(): any {
    let result: {[key: string]: any} = {
      trigger: "minecraft:consume_item"
    }
    if (this.item) {
      result["conditions"] = {
        item: {
          items: [this.item.getIdentifier()],
        },
      }
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
    let result: {[key: string]: any} = {
      trigger: "minecraft:inventory_changed"
    }
    if (this.item) {
      result["conditions"] = {
        items: [
          {
            items: [this.item.getIdentifier()],
          },
        ],
      }
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

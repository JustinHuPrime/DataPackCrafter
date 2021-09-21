export class FunctionValue {
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
}

export class AdvancementValue {
  name: string;
  title: string | undefined;
  icon: string | undefined;
  description: string | undefined;
  parent: string | undefined;
  rewardFunction: string | undefined;
  triggers: Trigger[];

  constructor(
    name: string,
    title: string | undefined,
    icon: string | undefined,
    description: string | undefined,
    parent: string | undefined,
    rewardFunction: string | undefined,
    triggers: Trigger[],
  ) {
    this.name = name;
    this.title = title;
    this.icon = icon;
    this.description = description;
    this.parent = parent;
    this.rewardFunction = rewardFunction;
    this.triggers = triggers;
  }
}

export abstract class Trigger {}

export class ConsumeItem extends Trigger {
  item: ItemSpec;

  constructor(item: ItemSpec) {
    super();
    this.item = item;
  }
}

export class InventoryChanged extends Trigger {
  item: ItemSpec;

  constructor(item: ItemSpec) {
    super();
    this.item = item;
  }
}

export class Raw extends Trigger {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export abstract class ItemSpec {}

export class ItemMatcher extends ItemSpec {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export class TagMatcher extends ItemSpec {
  tag: string;

  constructor(tag: string) {
    super();
    this.tag = tag;
  }
}

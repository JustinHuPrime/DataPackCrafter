const fs = require("fs");
const path = require("path");

import { AdvancementValue, FunctionValue } from "./store";

export abstract class Serializable {
  public abstract serialize(): any;
}

export abstract class Writeable {
  public abstract getWriter(path: string): Writer;
}

export abstract class Writer {
  path: string;

  protected constructor(path: string) {
    this.path = path;
  }

  protected createDir() {
    fs.mkdirSync(this.path, {recursive: true});
  }

  public abstract getFullFileName(): string;

  public abstract write(): void;

}

export class FunctionValueWriter extends Writer {
  functionValue: FunctionValue;

  constructor(path: string, functionValue: FunctionValue) {
    super(path);
    this.functionValue = functionValue;
  }

  public getFullFileName(): string {
    const baseFilename: string = this.functionValue.name.trim() + ".mcfunction";
    return path.join(this.path, baseFilename);
  }

  public write(): void {
    this.createDir();
    const serialized: any = this.functionValue.serialize();
    fs.writeFileSync(this.getFullFileName(), serialized);
  }

}

export class AdvancementValueWriter extends Writer {
  advancementValue: AdvancementValue;

  constructor(path: string, advancementValue: AdvancementValue) {
    super(path);
    this.advancementValue = advancementValue;
  }

  public getFullFileName(): string {
    const baseFilename: string = this.advancementValue.name.trim() + ".json";
    return path.join(this.path, baseFilename);
  }

  public write(): void {
    this.createDir();
    const serialized: any = this.advancementValue.serialize();
    fs.writeFileSync(this.getFullFileName(), JSON.stringify(serialized, null, 2));
  }
}
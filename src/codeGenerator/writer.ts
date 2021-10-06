import { Archiver } from "archiver";

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

import { AdvancementValue, FunctionValue, LoadFunctionTagValue } from "./store";
import STORE from "./store";

const DATA = "data";
const MINECRAFT = "minecraft";
const FUNCTION_TAGS_PATH = `${MINECRAFT}/tags/functions`;

export abstract class Serializable {
  public abstract serialize(): any;
}

export abstract class Writeable {
  public abstract getWriter(namespace: string): Writer;
}

function createPackMeta(namespace: string, archive: Archiver) {
  const packMeta: any = {
    pack: {
      pack_format: 7,
      description: namespace,
    },
  };

  archive.append(JSON.stringify(packMeta, null, 2), { name: "pack.mcmeta" });
}

function createLoadFunctionTag(namespace: string, archive: Archiver) {
  const functionValues: FunctionValue[] = Array.from(STORE.values())
    .filter((value: FunctionValue | AdvancementValue) => value instanceof FunctionValue && value.isLoadFunction()) as FunctionValue[];

  if (functionValues.length <= 0) return;

  const loadFunctionTagValue: LoadFunctionTagValue = new LoadFunctionTagValue(namespace, functionValues);
  const writer: Writer = loadFunctionTagValue.getWriter();
  writer.write(archive);
}

export async function writeStore(namespace: string, outputFile: string, archive?: Archiver) {
  const writeables: Writeable[] = Array.from(STORE.values());

  archive = archive || archiver("zip") as Archiver;
  const output = fs.createWriteStream(outputFile);

  for (const writeable of writeables) {
    const writer: Writer = writeable.getWriter(namespace);
    writer.write(archive);
  }

  // should just create 1 load.json
  createLoadFunctionTag(namespace, archive);
  createPackMeta(namespace, archive);

  archive.pipe(output);
  await archive.finalize();
}

export abstract class Writer {
  namespace: string;

  protected constructor(namespace: string) {
    this.namespace = namespace;
  }

  public abstract getFullFileName(): string;

  public abstract write(archive: Archiver): void;

}

export class FunctionValueWriter extends Writer {
  functionValue: FunctionValue;

  constructor(namespace: string, functionValue: FunctionValue) {
    super(namespace);
    this.functionValue = functionValue;
  }

  public getFullFileName(): string {
    const baseFilename: string = this.functionValue.name.trim() + ".mcfunction";
    return path.join(DATA, this.namespace, "functions", baseFilename);
  }

  public write(archive: Archiver): void {
    const serialized: any = this.functionValue.serialize();
    archive.append(serialized, { name: this.getFullFileName() });
  }

}

export class AdvancementValueWriter extends Writer {
  advancementValue: AdvancementValue;

  constructor(namespace: string, advancementValue: AdvancementValue) {
    super(namespace);
    this.advancementValue = advancementValue;
  }

  public getFullFileName(): string {
    const baseFilename: string = this.advancementValue.name.trim() + ".json";
    return path.join(DATA, this.namespace, "advancements", baseFilename);
  }

  public write(archive: Archiver): void {
    const serialized: any = this.advancementValue.serialize();
    archive.append(JSON.stringify(serialized, null, 2), { name: this.getFullFileName() });
  }
}

export class LoadFunctionTagValueWriter extends Writer {
  loadFunctionTagValue: LoadFunctionTagValue;

  constructor(loadFunctionTagValue: LoadFunctionTagValue) {
    super(MINECRAFT);
    this.loadFunctionTagValue = loadFunctionTagValue;
  }

  public getFullFileName(): string {
    const baseFilename: string = "load.json";
    return path.join(DATA, FUNCTION_TAGS_PATH, baseFilename);
  }

  public write(archive: Archiver): void {
    const serialized: any = this.loadFunctionTagValue.serialize();
    archive.append(JSON.stringify(serialized, null, 2), { name: this.getFullFileName() });
  }
}
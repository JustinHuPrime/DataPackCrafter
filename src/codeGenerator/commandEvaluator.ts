import { Grant, Revoke, Execute, RawCommand, Command } from "../ast/ast";
import { CommandVisitor } from "../ast/visitor";
import { Evaluator, EvaluatorEnv } from "./evaluator";
import { DSLTypeError, DSLReferenceError } from "./exceptions";
import STORE, { AdvancementValue, FunctionValue } from "./store";

export default class CommandEvaluator implements CommandVisitor {
  private evaluator: Evaluator;
  private env: EvaluatorEnv;

  constructor(evaluator: Evaluator, env: EvaluatorEnv) {
    this.evaluator = evaluator;
    this.env = env;
  }

  parse(command: Command) {
    return command.accept(this);
  }

  validateFunction(name: string, sourceCommand: Command) {
    if (!name.includes(":")) {
      // Only check calls to functions defined in the DSL datapack
      let fn = STORE.get(name);
      if (!(fn instanceof FunctionValue)) {
        throw new DSLReferenceError(
          sourceCommand,
          `Unknown Minecraft function ${name}. If you meant to refer to a function ` +
            `outside this datapack, specify its full resource path (namespace:fnName) instead.`,
        );
      }
    }
  }

  validateAdvancement(name: string, sourceCommand: Command) {
    if (!name.includes(":")) {
      let adv = STORE.get(name);
      if (!(adv instanceof AdvancementValue)) {
        throw new DSLReferenceError(
          sourceCommand,
          `Unknown advancement ${name}. If you meant to refer to an advancement ` +
            `outside this datapack, specify its full resource path (namespace:advName) instead.`,
        );
      }
    }
  }

  visitGrant(astNode: Grant): string[] {
    let advName = this.evaluator.evaluateExpectType(
      astNode.name,
      this.env,
      "string",
      "grant command parameter",
    );
    this.validateAdvancement(advName, astNode);
    return [`advancement grant @p only ${advName}`];
  }
  visitRevoke(astNode: Revoke): string[] {
    let advName = this.evaluator.evaluateExpectType(
      astNode.name,
      this.env,
      "string",
      "revoke command parameter",
    );
    this.validateAdvancement(advName, astNode);
    return [`advancement revoke @p only ${advName}`];
  }
  visitExecute(astNode: Execute): string[] {
    let fnName = this.evaluator.evaluateExpectType(
      astNode.name,
      this.env,
      "string",
      "execute command parameter",
    );
    this.validateFunction(fnName, astNode);
    return [`function ${fnName}`];
  }

  visitRawCommand(astNode: RawCommand): string[] {
    let commands: string[] = [];
    let result = astNode.command.accept(this.evaluator, this.env);
    if (typeof result === "string") {
      commands.push(result);
    } else if (Array.isArray(result)) {
      for (let command of result) {
        if (typeof command === "string") {
          commands.push(command);
        } else {
          throw new DSLTypeError(
            astNode.command,
            `expected string array in raw command list, got item of type ${typeof command}`,
          );
        }
      }
    } else {
      throw new DSLTypeError(
        astNode.command,
        `expected string in raw command list, got item of type ${typeof result}`,
      );
    }
    return commands;
  }
}

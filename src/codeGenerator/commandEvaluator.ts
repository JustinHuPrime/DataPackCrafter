import { Grant, Revoke, Execute, RawCommand, Command } from "../ast/ast";
import { CommandVisitor } from "../ast/visitor";
import { Evaluator, EvaluatorEnv } from "./evaluator";
import { DSLTypeError } from "./exceptions";

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

    visitGrant(astNode: Grant): string[] {
        return [`advancement grant @p only ${this.evaluator.evaluateExpectType(
                                             astNode.name, this.env, "string", "grant command parameter")}`];
    }
    visitRevoke(astNode: Revoke): string[] {
        return [`advancement revoke @p only ${this.evaluator.evaluateExpectType(
                                              astNode.name, this.env, "string", "revoke command parameter")}`];
    }
    visitExecute(astNode: Execute): string[] {
        return [`function ${this.evaluator.evaluateExpectType(astNode.name, this.env, "string", "execute command parameter")}`];
    }

    visitRawCommand(astNode: RawCommand): string[] {
        let commands: string[] = [];
        let result = astNode.command.accept(this.evaluator, this.env);
        if (typeof result === "string") {
            commands.push(result)
        } else if (Array.isArray(result)) {
            for (let command of result) {
                if (typeof command === "string") {
                    commands.push(command);
                } else {
                    throw new DSLTypeError(astNode.command, `expected string array in raw command list, got item of type ${typeof command}`);
                }
            }
        } else {
            throw new DSLTypeError(astNode.command, `expected string in raw command list, got item of type ${typeof result}`)
        }
        return commands;
    }

}

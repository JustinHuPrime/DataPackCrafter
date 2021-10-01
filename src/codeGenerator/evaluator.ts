import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False, ASTNumber, ASTString, MCFunction, Expression, BinaryOperator, UnaryOperator, Id, Title, Icon, Description, Parent, Trigger, Load, Execute, Grant, Revoke, RawCommand, Tick, ConsumeItem, ItemSpec, TagMatcher, ItemMatcher, InventoryChanged, CombinedTrigger, Command } from "../ast/ast";
import { ExpressionVisitor } from "../ast/visitor";
import { DSLEvaluationError, DSLIndexError, DSLMathError, DSLNameConflictError, DSLReferenceError, DSLSyntaxError, DSLTypeError } from "./exceptions"
import STORE, * as Store from "./store";
let deepEqual = require('deep-equal');

// Used to validate user defined advancement / function names
export let VALID_MC_ID_REGEX = /^[0-9a-z_-]+[0-9a-z_.-]*/;

/**
 * Represents internal data types known to the evaluator.
 */
export type EvaluatorData = string | boolean | number | EvaluatorData[] | FunctionClosure;

/**
 * Represents an evaluator environment, mapping variable names to their value
 */
export type EvaluatorEnvMap = {[id: string]: EvaluatorData};
export class EvaluatorEnv {
    envMap: EvaluatorEnvMap

    constructor(envMap: EvaluatorEnvMap) {
        this.envMap = envMap;
    }

    /**
     * Fetch the given ID from the environment, or return undefined if not found.
     */
    fetch(id: string) {
        return this.envMap[id];
    }

    /**
     * Extend the environment with an id->data mapping
     * @param id      name of the variable
     * @param data    the data it should represent
     * @param inPlace Whether to insert the id->data mapping without copying the env
     *                (typically only needed for function definitions to support recursion)
     */
    extend(id: string, data: EvaluatorData, inPlace?: boolean) : EvaluatorEnv {
        let newEnv : EvaluatorEnvMap;
        if (inPlace) {
            newEnv = this.envMap;
        } else {
            newEnv = Object.assign({}, this.envMap);  // copy the whole mapping
        }
        newEnv[id] = data;

        if (inPlace) {
            return this;
        } else {
            return new EvaluatorEnv(newEnv);
        }
    }
}

/**
 * Represents a DSL-level function and its surrounding environment
 */
export class FunctionClosure {
    fn: Define;
    env: EvaluatorEnv;

    constructor(fn: Define, env: EvaluatorEnv) {
        this.fn = fn;
        this.env = env;
    }
}


export class Evaluator implements ExpressionVisitor {
    // Counters used to generate Minecraft function and advancement names
    fnCounter = 0;
    advCounter = 0;

    /**
     * Evaluate a DSL expression.
     * @param expression expression
     * @param env        environment of variables (or empty env if not given)
     * @returns          result of evaluation (a subtype of EvaluatorData)
     */
    evaluate(expression: Expression, env?: EvaluatorEnv) {
        if (env == null) {
            env = new EvaluatorEnv({});
        }
        return expression.accept(this, env);
    }

    /**
     * Evaluate a DSL expression with type checking.
     * @param expression    expression
     * @param env           environment of variables
     * @param expectedType  JavaScript built-in type to check output against
     * @param typeErrorDesc element description to raise DSLTypeError with, if expectedType check fails
     * @returns             result of evaluation (a subtype of EvaluatorData)
     */
     evaluateExpectType(expression: Expression, env: EvaluatorEnv, expectedType: string, typeErrorDesc?: string) {
        if (env == null) {
            env = new EvaluatorEnv({});
        }
        let result = expression.accept(this, env);
        if (expectedType != null && typeof result !== expectedType) {
            let desc = typeErrorDesc ? `for ${typeErrorDesc}` : "";
            throw new DSLTypeError(expression, `expected type ${desc} ${expectedType}, got ${typeof result}`);
        }
        return result;
    }
    protected sanitize(expr: Expression, data: EvaluatorData) : EvaluatorData {
        if (typeof data === "number" && !isFinite(data)) {
            throw new DSLMathError(expr, "Math overflow or divide by zero");
        }
        return data;
    }

    /**
     * Generates an advancement with an optional prefix.
     */
    genAdvancementName(prefix?: string) {
        let counter = this.advCounter++;
        return `.${prefix || "advancement"}${counter}`.toLowerCase();
    }

    /**
     * Generates a Minecraft function with an optional prefix.
     */
    genFunctionName(prefix?: string) {
        let counter = this.fnCounter++;
        return `.${prefix || "function"}${counter}`.toLowerCase();
    }

    /**
     * Update the store with the given value, throwing a DSLNameConflictError
     * if an identifier of that name already exists
     */
    updateStore(name: string, value: Store.FunctionValue | Store.AdvancementValue, sourceExpression: Expression) {
        if (STORE.has(name)) {
            throw new DSLNameConflictError(sourceExpression, `function / advancement name collision on ${name}`);
        }
        return STORE.set(name, value);
    }

    visitImport(_astNode: Import, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitDefine(astNode: Define, env: EvaluatorEnv) : EvaluatorData {
        let fnArgNames = new Set();
        for (let fnArgName of astNode.args) {
            if (fnArgNames.has(fnArgName.id)) {
                throw new DSLSyntaxError(astNode, `define: Duplicate function argument name ${fnArgName}`);
            }
            fnArgNames.add(fnArgName.id);
        }

        let closure = new FunctionClosure(astNode, env);
        if (astNode.id !== null) {
            // IDs at binding time are treated as raw strings, and not evaluated further
            env.extend(astNode.id.id, closure, true);
        }
        return closure;
    }
    visitLet(astNode: Let, env: EvaluatorEnv) : EvaluatorData {
        if (astNode.ids.length !== astNode.values.length) {
            throw new DSLSyntaxError(astNode,
                `let: Lengths of IDs (${astNode.ids.length}) and expressions (${astNode.values.length}) do not match`);
        }
        let newEnv = env;
        for (let idx in astNode.ids) {
            let id = astNode.ids[idx];
            if (id == null) {
                throw new DSLSyntaxError(astNode, `let: Expected string ID in index ${idx}, got ${id}`);
            }

            let expr = astNode.values[idx];
            if (expr == null) {
                throw new DSLSyntaxError(astNode, `let: Expected expression in index ${idx}, got ${expr}`);
            }

            let result = expr.accept(this, env);
            // IDs at binding time are treated as raw strings, and not evaluated further
            newEnv = newEnv.extend(id.id, result);
        }
        return astNode.body.accept(this, newEnv);
    }
    visitIf(astNode: If, env: EvaluatorEnv) : EvaluatorData {
        let value = astNode.predicate.accept(this, env);
        if (typeof value !== "boolean") {
            throw new DSLTypeError(astNode, `incorrect type of operand for if (expected boolean, got ${typeof value})`);
        }
        if (value) {
            return astNode.consequent.accept(this, env);
        } else {
            return astNode.alternative.accept(this, env);
        }
    }
    visitFor(astNode: For, env: EvaluatorEnv) : EvaluatorData {
        let forResult: EvaluatorData[] = [];
        let variableName = astNode.id.id;
        let iterableValue = astNode.iterable.accept(this, env);
        if (typeof iterableValue !== "string" && !Array.isArray(iterableValue)) {
            throw new DSLTypeError(astNode, `for: expected list or string as target, got ${typeof iterableValue}`)
        }
        for (let elem of iterableValue) {
            let newEnv = env.extend(variableName, elem);
            let result = astNode.body.accept(this, newEnv);
            forResult.push(result);
        }
        return forResult;
    }
    visitPrint(astNode: Print, env: EvaluatorEnv) : EvaluatorData {
        let s = astNode.expression.accept(this, env);
        console.log(s);
        return s;
    }

    typecheckBinOp(expr: Expression|null, lhs: EvaluatorData, rhs: EvaluatorData, op: BinaryOperator) {
        let lhsType = typeof lhs;
        let rhsType = typeof rhs;
        switch (op) {
            case BinaryOperator.AND:
            case BinaryOperator.OR:
                if (lhsType !== "boolean" || lhsType !== rhsType) {
                    throw new DSLTypeError(expr, `incorrect type of operand for AND/OR (expected boolean; got ${lhsType})`);
                }
                if (lhsType !== rhsType) {
                    throw new DSLTypeError(expr, `type mismatch for operands (got ${lhsType} and ${rhsType})`);
                }
                return;
            case BinaryOperator.EQ:
            case BinaryOperator.NEQ: {
                return; // any types are ok
            }
            case BinaryOperator.LT:
            case BinaryOperator.LTE:
            case BinaryOperator.GT:
            case BinaryOperator.GTE:
                if (lhsType !== "string" && lhsType !== "number") {
                    throw new DSLTypeError(expr, `incorrect type of operand for compare (expected string or number; got ${lhsType})`);
                }
                if (lhsType !== rhsType) {
                    throw new DSLTypeError(expr, `type mismatch for operands (got ${lhsType} and ${rhsType})`);
                }
                return;
            case BinaryOperator.ADD: {
                if (lhsType !== "string" && lhsType !== "number" && !Array.isArray(lhs)) {
                    throw new DSLTypeError(expr, `incorrect type of operand for add (expected string, number, or list; got ${lhsType})`);
                }
                if (lhsType !== rhsType) {
                    throw new DSLTypeError(expr, `type mismatch for operands (got ${lhsType} and ${rhsType})`);
                }
                return;
            }
            case BinaryOperator.SUB:
            case BinaryOperator.MUL:
            case BinaryOperator.DIV:
            case BinaryOperator.MOD: {
                if (lhsType !== "number") {
                    throw new DSLTypeError(expr, `incorrect type of operand for arithmetic (expected number, got ${lhsType})`);
                }
                if (lhsType !== rhsType) {
                    throw new DSLTypeError(expr, `type mismatch for operands (got ${lhsType} and ${rhsType})`);
                }
            }
        }

    }

    visitBinop(astNode: Binop, env: EvaluatorEnv) : EvaluatorData {
        let lhs = astNode.lhs.accept(this, env);
        let rhs = astNode.rhs.accept(this, env);
        this.typecheckBinOp(astNode, lhs, rhs, astNode.op);
        switch (astNode.op) {
            case BinaryOperator.AND: {
                return lhs && rhs;
            }
            case BinaryOperator.OR: {
                return lhs || rhs;
            }
            case BinaryOperator.EQ: {
                return deepEqual(lhs, rhs);
            }
            case BinaryOperator.NEQ: {
                return !deepEqual(lhs, rhs);
            }
            case BinaryOperator.LT: {
                return lhs < rhs;
            }
            case BinaryOperator.LTE: {
                return lhs <= rhs;
            }
            case BinaryOperator.GT: {
                return lhs > rhs;
            }
            case BinaryOperator.GTE: {
                return lhs >= rhs;
            }
            case BinaryOperator.ADD: {
                if (Array.isArray(lhs)) {
                    return lhs.concat(rhs);
                } else {
                    return this.sanitize(astNode, lhs + rhs);
                }
            }
            case BinaryOperator.SUB: {
                return this.sanitize(astNode, lhs - rhs);
            }
            case BinaryOperator.MUL: {
                return this.sanitize(astNode, lhs * rhs);
            }
            case BinaryOperator.DIV: {
                return this.sanitize(astNode, lhs / rhs);
            }
            case BinaryOperator.MOD: {
                return this.sanitize(astNode, lhs % rhs);
            }
        }
        throw new DSLSyntaxError(astNode, `Unknown operator ${astNode.op}`);
    }

    visitUnop(astNode: Unop, env: EvaluatorEnv) : EvaluatorData {
        let value = astNode.target.accept(this, env);
        switch (astNode.op) {
            case UnaryOperator.NEG:
                if (typeof value !== "number") {
                    throw new DSLTypeError(astNode, `incorrect type of operand for negation (expected number, got ${typeof value})`);
                }
                return -value;
            case UnaryOperator.NOT:
                if (typeof value !== "boolean") {
                    throw new DSLTypeError(astNode, `incorrect type of operand for NOT (expected boolean, got ${typeof value})`);
                }
                return !value;
       }
    }
    visitIndex(astNode: Index, env: EvaluatorEnv) : EvaluatorData {
        let targetValue = astNode.target.accept(this, env);
        if (typeof targetValue !== "string" && !Array.isArray(targetValue)) {
            throw new DSLTypeError(astNode, `index: cannot index value of type ${typeof targetValue}`)
        }
        let indexValue = astNode.index.accept(this, env);
        if (typeof indexValue !== "number") {
            throw new DSLTypeError(astNode, `index: expected number as index, got ${typeof indexValue}`);
        }
        let result = targetValue[indexValue];
        if (result == null) {
            throw new DSLIndexError(astNode, `index: index ${indexValue} invalid or out of range`);
        }
        return result;
    }
    visitSlice(astNode: Slice, env: EvaluatorEnv) : EvaluatorData {
        let targetValue = astNode.target.accept(this, env);

        // from is 0 (start) if not given
        let fromValue = 0;
        // to is undefined (end of iterable) if not given
        let toValue = undefined;

        if (astNode.from != null) {
            fromValue = astNode.from.accept(this, env);
        }
        if (astNode.to != null) {
            toValue = astNode.to.accept(this, env);
        }

        if (typeof targetValue !== "string" && !Array.isArray(targetValue)) {
            throw new DSLTypeError(astNode, `slice: bad type for target (expected string or list, got ${typeof toValue})`);
        }
        if (typeof fromValue !== "number") {
            throw new DSLTypeError(astNode, `slice: bad type for start argument (got ${typeof fromValue})`);
        }
        if (typeof toValue !== "number" && toValue !== undefined) {
            throw new DSLTypeError(astNode, `slice: bad type for end argument (got ${typeof toValue})`);
        }
        let result = targetValue.slice(fromValue, toValue);
        return result;
    }
    visitCall(astNode: Call, env: EvaluatorEnv) : EvaluatorData {
        let fnClosure = astNode.target.accept(this, env);
        let fnName = fnClosure.fn.id || "<anonymous function>";
        if (!(fnClosure instanceof FunctionClosure)) {
            throw new DSLTypeError(astNode, `call: attempted to call non-function ${JSON.stringify(fnClosure)}`)
        }
        if (astNode.args.length !== fnClosure.fn.args.length) {
            throw new DSLSyntaxError(astNode, `call: function ${fnName} expects ` +
                                     `${fnClosure.fn.args.length} arguments, got ${astNode.args.length}`)
        }
        let newEnv = fnClosure.env; // need to use env from closure!!
        for (let idx in astNode.args) {
            let fnArgName = fnClosure.fn.args[idx]?.id;
            let fnArgExpr = astNode.args[idx];
            if (fnArgName == null || fnArgExpr == null) {
                throw new DSLSyntaxError(astNode, `call: could not read arguments for ${fnName} (either name ` +
                                         `${JSON.stringify(fnArgName)} or arg ${JSON.stringify(fnArgExpr)} are null`);
            }
            let fnArgValue = fnArgExpr.accept(this, env);
            newEnv = newEnv.extend(fnArgName, fnArgValue);
        }
        return fnClosure.fn.body.accept(this, newEnv);
    }
    visitList(astNode: List, env: EvaluatorEnv) : EvaluatorData {
        return astNode.elements.map((expr) => { return expr.accept(this, env) });
    }
    visitBegin(astNode: Begin, env: EvaluatorEnv) : EvaluatorData {
        let result;
        for (let expr of astNode.elements) {
            result = expr.accept(this, env);
        }
        return result;  // just return the last result
    }

    // FIXME: lots of switch on type nonsense
    translateItemSpec(itemSpec: ItemSpec | null, env: EvaluatorEnv, sourceExpression: Expression): Store.ItemSpec | null {
        if (itemSpec == null) {
            return null;
        }
        if (itemSpec instanceof ItemMatcher) {
            let str = this.evaluateExpectType(itemSpec.name, env, "string", "advancement trigger item specification");
            return new Store.ItemMatcher(str);
        } else if (itemSpec instanceof TagMatcher) {
            let str = this.evaluateExpectType(itemSpec.name, env, "string", "advancement trigger item specification");
            return new Store.TagMatcher(str);
        } else {
            throw new DSLEvaluationError(sourceExpression, `Unknown ItemSpec class ${itemSpec.constructor.name}`);
        }
    }

    parseTrigger(trigger: Trigger, env: EvaluatorEnv, sourceExpression: Expression) : Store.Trigger[] {
        let results: Store.Trigger[] = [];
        if (trigger instanceof Load || trigger instanceof Tick) {
            throw new DSLSyntaxError(sourceExpression, "load and tick triggers cannot be combined");
        } else if (trigger instanceof ConsumeItem) {
            let itemSpec = this.translateItemSpec(trigger.details, env, sourceExpression);
            results.push(new Store.ConsumeItem(itemSpec));
        } else if (trigger instanceof InventoryChanged) {
            let itemSpec = this.translateItemSpec(trigger.details, env, sourceExpression);
            results.push(new Store.InventoryChanged(itemSpec));
        } else if (trigger instanceof CombinedTrigger) {
            results = results.concat(this.parseTrigger(trigger.lhs, env, sourceExpression));
            results = results.concat(this.parseTrigger(trigger.rhs, env, sourceExpression));
        }
        return results;
    }

    // FIXME: lots of switch on type nonsense
    parseCommands(astCommands: Command[], env: EvaluatorEnv, sourceExpression: Expression) : string[] {
        let commands: string[] = [];
        for (let astCommand of astCommands) {
            if (astCommand instanceof Grant) {
                commands.push(`advancement grant @p only ${this.evaluateExpectType(astCommand.name, env, "string", "grant command parameter")}`);
            } else if (astCommand instanceof Revoke) {
                commands.push(`advancement revoke @p only ${this.evaluateExpectType(astCommand.name, env, "string", "revoke command parameter")}`);
            } else if (astCommand instanceof Execute) {
                commands.push( `function ${this.evaluateExpectType(astCommand.name, env, "string", "execute command parameter")}`);
            } else if (astCommand instanceof RawCommand) {
                let result = astCommand.command.accept(this, env);
                if (typeof result === "string") {
                    commands.push(result)
                } else if (Array.isArray(result)) {
                    for (let command of result) {
                        if (typeof command === "string") {
                            commands.push(command);
                        } else {
                            throw new DSLTypeError(sourceExpression, `expected string array in raw command list, got item of type ${typeof command}`);
                        }
                    }
                } else {
                    throw new DSLTypeError(sourceExpression, `expected string in raw command list, got item of type ${typeof result}`)
                }
            } else {
                throw new DSLEvaluationError(sourceExpression, `on: Unknown command type ${astCommand.constructor.name}`);
            }
        }
        return commands;
    }

    visitOn(astNode: On, env: EvaluatorEnv) : EvaluatorData {
        let commands = this.parseCommands(astNode.commands, env, astNode);

        // Read the advancement trigger and prepare a Minecraft function
        let fnValue: Store.FunctionValue;
        let fnName = this.genFunctionName(astNode.trigger.constructor.name);
        let advName = ""; // FIXME: no advancement name to return for load and tick
        if (astNode.trigger instanceof Load) {
            fnValue = Store.FunctionValue.onLoad(fnName, commands);
        } else if (astNode.trigger instanceof Tick) {
            fnValue = Store.FunctionValue.onTick(fnName, commands);
        } else {
            fnValue = Store.FunctionValue.regular(fnName, commands);

            // For things that aren't load or tick, generate an advancement too
            advName = `.adv${fnName}`;
            let triggers = this.parseTrigger(astNode.trigger, env, astNode);
            let advValue = new Store.AdvancementValue(
                // everything is undefined, what has the world come to?? -JL
                advName, undefined, undefined, undefined, undefined, undefined, fnName, triggers
            )
            this.updateStore(advName, advValue, astNode);
        }
        this.updateStore(fnName, fnValue, astNode);
        return advName;
    }

    visitAdvancement(astNode: Advancement, env: EvaluatorEnv) : EvaluatorData {
        let name: string;
        if (astNode.name != null) {
            let evalName = this.evaluateExpectType(astNode.name, env, "string", "advancement name");
            if (!VALID_MC_ID_REGEX.test(evalName)) {
                throw new DSLSyntaxError(astNode, `advancement: invalid advancement name ${JSON.stringify(evalName)}`);
            }
            name = evalName;
        }
        name ||= this.genAdvancementName();

        let title = undefined;
        let iconItem = undefined;
        let description = undefined;
        let parent = undefined;
        for (let element of astNode.details) {
            if (element instanceof Title) {
                title = this.evaluateExpectType(element.title, env, "string", "advancement title");
            } else if (element instanceof Icon) {
                iconItem = this.evaluateExpectType(element.icon, env, "string", "advancement icon");
            } else if (element instanceof Description) {
                description = this.evaluateExpectType(element.description, env, "string", "advancement description");
            } else if (element instanceof Parent) {
                parent = this.evaluateExpectType(element.parent, env, "string", "advancement parent");
            }
        }
        let advancementValue = new Store.AdvancementValue(name, title, iconItem, undefined, description, parent, undefined, []);
        this.updateStore(name, advancementValue, astNode);
        return name;
    }
    visitFunction(astNode: MCFunction, env: EvaluatorEnv) : EvaluatorData {
        let name: string;
        if (astNode.name != null) {
            let evalName = this.evaluateExpectType(astNode.name, env, "string", "function name");
            if (!VALID_MC_ID_REGEX.test(evalName)) {
                throw new DSLSyntaxError(astNode, `function: invalid name ${JSON.stringify(evalName)}`);
            }
            name = evalName;
        }
        name ||= this.genFunctionName();
        let commands = this.parseCommands(astNode.commands, env, astNode);
        let fnValue = Store.FunctionValue.regular(name, commands);
        this.updateStore(name, fnValue, astNode);
        return name;
    }
    visitTrue(_astNode: True, _env: EvaluatorEnv) : EvaluatorData {
        return true;
    }
    visitFalse(_astNode: False, _env: EvaluatorEnv) : EvaluatorData {
        return false;
    }
    visitId(astNode: Id, env: EvaluatorEnv) {
        let result = env.fetch(astNode.id);
        if (result == null) {
            throw new DSLReferenceError(astNode, `Unknown variable ${astNode.id}`);
        }
        return result;
    }
    visitNumber(astNode: ASTNumber, _env: EvaluatorEnv) : EvaluatorData {
        return astNode.value;
    }
    visitString(astNode: ASTString, env: EvaluatorEnv) : EvaluatorData {
        let resultPieces: string[] = [];
        for (let component of astNode.components) {
            let result: string;
            // String components may contain either expressions or raw (JS) strings
            if (component instanceof Expression) {
                result = component.accept(this, env);
            } else {
                result = component;
            }
            resultPieces.push(result);
        }
        return String.prototype.concat(...resultPieces);
    }

}

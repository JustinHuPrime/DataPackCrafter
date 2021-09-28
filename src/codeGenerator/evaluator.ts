import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False, ASTNumber, ASTString, MCFunction, Expression, BinaryOperator, UnaryOperator, Id } from "../ast/ast";
import { AstVisitor } from "../ast/visitor";
//import STORE from "./store"

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
     * Fetch the given ID from the environment, or raise an error if it is not found.
     */
    fetch(id: string) {
        let data = this.envMap[id];
        if (data !== undefined) {
            return data;
        } else {
            // TODO: use a more specific error type
            throw new Error(`Unknown variable ${id}`);
        }
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
            newEnv = Object.assign({}, this.envMap);
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


export class Evaluator implements AstVisitor {
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

    protected _sanitizeNum(num: number) : number {
        if (isFinite(num)) {
            return num;
        } else {
            // We reject these to prevent confusing behaviour for the end user
            throw new Error("Math overflow or divide by zero");
        }
    }

    visitImport(_astNode: Import, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitDefine(astNode: Define, env: EvaluatorEnv) : EvaluatorData {
        let fnArgNames = new Set();
        for (let fnArgName of astNode.args) {
            if (fnArgNames.has(fnArgName.id)) {
                throw new Error(`define: Duplicate function argument name ${fnArgName}`);
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
            throw new Error(`let: Lengths of IDs (${astNode.ids.length}) and ` +
                            `expressions (${astNode.values.length}) do not match`)
        }
        let newEnv = env;
        for (let idx in astNode.ids) {
            let id = astNode.ids[idx];
            if (id == null) {
                throw new Error(`let: Expected string ID in index ${idx}, got ${id}`);
            }

            let expr = astNode.values[idx];
            if (expr == null) {
                throw new Error(`let: Expected expression in index ${idx}, got ${expr}`);
            }

            let result = expr.accept(this, env);
            // IDs at binding time are treated as raw strings, and not evaluated further
            newEnv = newEnv.extend(id.id, result);
        }
        return astNode.body.accept(this, newEnv);
    }
    visitIf(astNode: If, env: EvaluatorEnv) : EvaluatorData {
        if (astNode.predicate.accept(this, env)) {
            return astNode.consequent.accept(this, env);
        } else {
            return astNode.alternative.accept(this, env);
        }
    }
    visitFor(astNode: For, env: EvaluatorEnv) : EvaluatorData {
        let forResult: EvaluatorData[] = [];
        let variableName = astNode.id.id;
        let iterableValue = astNode.iterable.accept(this, env);
        if (!Array.isArray(iterableValue)) {
            throw new Error(`for: expected list as target, got type ${typeof iterableValue}`)
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
    visitBinop(astNode: Binop, env: EvaluatorEnv) : EvaluatorData {
        let lhs = astNode.lhs.accept(this, env);
        let rhs = astNode.rhs.accept(this, env);
        switch (astNode.op) {
            case BinaryOperator.AND: {
                return lhs && rhs;
            }
            case BinaryOperator.OR: {
                return lhs || rhs;
            }
            case BinaryOperator.EQ: {
                return lhs === rhs;
            }
            case BinaryOperator.NEQ: {
                return lhs !== rhs;
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
                return this._sanitizeNum(lhs + rhs);
            }
            case BinaryOperator.SUB: {
                return this._sanitizeNum(lhs - rhs);
            }
            case BinaryOperator.MUL: {
                return this._sanitizeNum(lhs * rhs);
            }
            case BinaryOperator.DIV: {
                return this._sanitizeNum(lhs / rhs);
            }
            case BinaryOperator.MOD: {
                return this._sanitizeNum(lhs % rhs);
            }
        }
        throw new Error(`Unknown operator ${astNode.op}`);
    }

    visitUnop(astNode: Unop, env: EvaluatorEnv) : EvaluatorData {
        let value = astNode.target.accept(this, env);
        switch (astNode.op) {
            case UnaryOperator.NEG:
                return -value;
            case UnaryOperator.NOT:
                return !value;
       }
    }
    visitIndex(astNode: Index, env: EvaluatorEnv) : EvaluatorData {
        let targetValue = astNode.target.accept(this, env);
        if (typeof targetValue !== "string" && !Array.isArray(targetValue)) {
            throw new Error(`index: cannot index value of type ${typeof targetValue}`)
        }
        let indexValue = astNode.index.accept(this, env);
        let result = targetValue[indexValue];
        if (result == null) {
            throw new Error(`index ${indexValue} invalid or out of range`);
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

        if (typeof fromValue !== "number") {
            throw new Error(`slice: bad type for start argument (got ${typeof fromValue})`);
        }
        if (typeof toValue !== "number" && toValue !== undefined) {
            throw new Error(`slice: bad type for end argument (got ${typeof toValue})`);
        }
        let result = targetValue.slice(fromValue, toValue);
        return result;
    }
    visitCall(astNode: Call, env: EvaluatorEnv) : EvaluatorData {
        let fnClosure = astNode.target.accept(this, env);
        let fnName = fnClosure.fn.id || "<anonymous function>";
        if (!(fnClosure instanceof FunctionClosure)) {
            throw new Error(`call: attempted to call non-function ${JSON.stringify(fnClosure)}`)
        }
        if (astNode.args.length !== fnClosure.fn.args.length) {
            throw new Error(`call: function ${fnName} expects ${fnClosure.fn.args.length} arguments, got ${astNode.args.length}`)
        }
        let newEnv = fnClosure.env; // need to use env from closure!!
        for (let idx in astNode.args) {
            let fnArgName = fnClosure.fn.args[idx]?.id;
            let fnArgExpr = astNode.args[idx];
            if (fnArgName == null || fnArgExpr == null ) {
                throw new Error(`call: could not read arguments for ${fnName} (either ${JSON.stringify(fnArgName)} or ` +
                                `${JSON.stringify(fnArgExpr)} are null`);
            }
            let fnArgValue = fnArgExpr.accept(this, env);
            newEnv = newEnv.extend(fnArgName, fnArgValue);
        }
        return fnClosure.fn.body.accept(this, newEnv);
    }
    visitList(astNode: List, env: EvaluatorEnv) : EvaluatorData {
        let results: EvaluatorData[] = [];
        for (let expr of astNode.elements) {
            results.push(expr.accept(this, env));
        }
        return results;
    }
    visitBegin(astNode: Begin, env: EvaluatorEnv) : EvaluatorData {
        let result;
        if (astNode.elements.length === 0) {
            throw new Error("begin: cannot have a begin expr with 0 elements")
        }
        for (let expr of astNode.elements) {
            result = expr.accept(this, env);
        }
        return result;  // just return the last result
    }
    visitOn(_astNode: On, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitAdvancement(_astNode: Advancement, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitFunction(_astNode: MCFunction, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitTrue(_astNode: True, _env: EvaluatorEnv) : EvaluatorData {
        return true;
    }
    visitFalse(_astNode: False, _env: EvaluatorEnv) : EvaluatorData {
        return false;
    }
    visitId(astNode: Id, env: EvaluatorEnv) {
        return env.fetch(astNode.id);
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

import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False, ASTNumber, ASTString, MCFunction, Expression, BinaryOperator, UnaryOperator, Id } from "../ast/ast";
import { ExpressionVisitor } from "../ast/visitor";
import { DSLIndexError, DSLMathError, DSLReferenceError, DSLSyntaxError, DSLTypeError } from "./exceptions"
//import STORE from "./store"
let deepEqual = require('deep-equal');

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

    protected sanitize(expr: Expression, data: EvaluatorData) : EvaluatorData {
        if (typeof data === "number" && !isFinite(data)) {
            throw new DSLMathError(expr, "Math overflow or divide by zero");
        }
        return data;
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
        // TODO: typecheck the predicate value
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
            throw new DSLTypeError(astNode, `for: expected list as target, got type ${typeof iterableValue}`)
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

    // TODO: typecheck
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
            if (fnArgName == null || fnArgExpr == null ) {
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

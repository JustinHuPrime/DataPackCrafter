import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False, ASTNumber, ASTString, MCFunction, Expression, BinaryOperator, UnaryOperator } from "../ast/ast";
import { AstVisitor } from "../ast/visitor";
//import STORE from "./store"

/**
 * Represents internal data types known to the evaluator.
 */
export type EvaluatorData = string | boolean | number | [EvaluatorData] | FunctionClosure;

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
    evaluate(expression: Expression) {
        return expression.accept(this, new EvaluatorEnv({}));
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
    visitDefine(_astNode: Define, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitLet(_astNode: Let, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitIf(astNode: If, env: EvaluatorEnv) : EvaluatorData {
        if (astNode.predicate.accept(this, env)) {
            return astNode.consequent.accept(this, env);
        } else {
            return astNode.alternative.accept(this, env);
        }
    }
    visitFor(_astNode: For, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitPrint(_astNode: Print, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
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
    visitIndex(_astNode: Index, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitSlice(_astNode: Slice, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitCall(_astNode: Call, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitList(_astNode: List, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitBegin(_astNode: Begin, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
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
    visitNumber(astNode: ASTNumber, _env: EvaluatorEnv) : EvaluatorData {
        return astNode.value;
    }
    visitString(_astNode: ASTString, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }

}

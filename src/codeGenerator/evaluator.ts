import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False } from "../ast/ast";
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
    visitImport(_astNode: Import, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitDefine(_astNode: Define, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitLet(_astNode: Let, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitIf(_astNode: If, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitFor(_astNode: For, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitPrint(_astNode: Print, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitBinop(_astNode: Binop, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitUnop(_astNode: Unop, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
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
    visitFunction(_astNode: Function, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitTrue(_astNode: True, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitFalse(_astNode: False, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitNumber(_astNode: Number, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }
    visitString(_astNode: String, _env: EvaluatorEnv) : EvaluatorData {
        throw new Error("Method not implemented.");
    }

}

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
    visitImport(_astNode: Import) : void{
        throw new Error("Method not implemented.");
    }
    visitDefine(_astNode: Define) : void{
        throw new Error("Method not implemented.");
    }
    visitLet(_astNode: Let) : void{
        throw new Error("Method not implemented.");
    }
    visitIf(_astNode: If) : void{
        throw new Error("Method not implemented.");
    }
    visitFor(_astNode: For) : void{
        throw new Error("Method not implemented.");
    }
    visitPrint(_astNode: Print) : void{
        throw new Error("Method not implemented.");
    }
    visitBinop(_astNode: Binop) : void{
        throw new Error("Method not implemented.");
    }
    visitUnop(_astNode: Unop) : void{
        throw new Error("Method not implemented.");
    }
    visitIndex(_astNode: Index) : void{
        throw new Error("Method not implemented.");
    }
    visitSlice(_astNode: Slice) : void{
        throw new Error("Method not implemented.");
    }
    visitCall(_astNode: Call) : void{
        throw new Error("Method not implemented.");
    }
    visitList(_astNode: List) : void{
        throw new Error("Method not implemented.");
    }
    visitBegin(_astNode: Begin) : void{
        throw new Error("Method not implemented.");
    }
    visitOn(_astNode: On) : void{
        throw new Error("Method not implemented.");
    }
    visitAdvancement(_astNode: Advancement) : void{
        throw new Error("Method not implemented.");
    }
    visitFunction(_astNode: Function) : void{
        throw new Error("Method not implemented.");
    }
    visitTrue(_astNode: True) : void{
        throw new Error("Method not implemented.");
    }
    visitFalse(_astNode: False) : void{
        throw new Error("Method not implemented.");
    }
    visitNumber(_astNode: Number) : void{
        throw new Error("Method not implemented.");
    }
    visitString(_astNode: String) : void{
        throw new Error("Method not implemented.");
    }

}

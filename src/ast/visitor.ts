import { EvaluatorEnv } from "../codeGenerator/evaluator";
import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False } from "./ast";

export interface AstVisitor {
  visitImport(astNode: Import, env: EvaluatorEnv) : any;
  visitDefine(astNode: Define, env: EvaluatorEnv) : any;
  visitLet(astNode: Let, env: EvaluatorEnv) : any;
  visitIf(astNode: If, env: EvaluatorEnv) : any;
  visitFor(astNode: For, env: EvaluatorEnv) : any;
  visitPrint(astNode: Print, env: EvaluatorEnv) : any;
  visitBinop(astNode: Binop, env: EvaluatorEnv) : any;
  visitUnop(astNode: Unop, env: EvaluatorEnv) : any;
  visitIndex(astNode: Index, env: EvaluatorEnv) : any;
  visitSlice(astNode: Slice, env: EvaluatorEnv) : any;
  visitCall(astNode: Call, env: EvaluatorEnv) : any;
  visitList(astNode: List, env: EvaluatorEnv) : any;
  visitBegin(astNode: Begin, env: EvaluatorEnv) : any;
  visitOn(astNode: On, env: EvaluatorEnv) : any;
  visitAdvancement(astNode: Advancement, env: EvaluatorEnv) : any;
  visitFunction(astNode: Function, env: EvaluatorEnv) : any;
  visitTrue(astNode: True, env: EvaluatorEnv) : any;
  visitFalse(astNode: False, env: EvaluatorEnv) : any;
  visitNumber(astNode: Number, env: EvaluatorEnv) : any;
  visitString(astNode: String, env: EvaluatorEnv) : any;
}

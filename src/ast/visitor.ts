import { EvaluatorEnv } from "../codeGenerator/evaluator";
import {
  Import,
  Define,
  Let,
  If,
  For,
  Print,
  Binop,
  Unop,
  Index,
  Slice,
  Call,
  List,
  Begin,
  On,
  Advancement,
  True,
  False,
  ASTNumber,
  ASTString,
  MCFunction,
  Id,
  Execute,
  Grant,
  RawCommand,
  Revoke,
  CombinedTrigger,
  ConsumeItem,
  InventoryChanged,
  Load,
  RawTrigger,
  Tick,
  ItemMatcher,
  TagMatcher,
} from "./ast";

export interface ExpressionVisitor {
  visitImport(astNode: Import, env: EvaluatorEnv): any;
  visitDefine(astNode: Define, env: EvaluatorEnv): any;
  visitLet(astNode: Let, env: EvaluatorEnv): any;
  visitIf(astNode: If, env: EvaluatorEnv): any;
  visitFor(astNode: For, env: EvaluatorEnv): any;
  visitPrint(astNode: Print, env: EvaluatorEnv): any;
  visitBinop(astNode: Binop, env: EvaluatorEnv): any;
  visitUnop(astNode: Unop, env: EvaluatorEnv): any;
  visitIndex(astNode: Index, env: EvaluatorEnv): any;
  visitSlice(astNode: Slice, env: EvaluatorEnv): any;
  visitCall(astNode: Call, env: EvaluatorEnv): any;
  visitList(astNode: List, env: EvaluatorEnv): any;
  visitBegin(astNode: Begin, env: EvaluatorEnv): any;
  visitOn(astNode: On, env: EvaluatorEnv): any;
  visitAdvancement(astNode: Advancement, env: EvaluatorEnv): any;
  visitFunction(astNode: MCFunction, env: EvaluatorEnv): any;
  visitTrue(astNode: True, env: EvaluatorEnv): any;
  visitFalse(astNode: False, env: EvaluatorEnv): any;
  visitId(astNode: Id, env: EvaluatorEnv): any;
  visitNumber(astNode: ASTNumber, env: EvaluatorEnv): any;
  visitString(astNode: ASTString, env: EvaluatorEnv): any;
}

export interface CommandVisitor {
  visitGrant(astNode: Grant) : any;
  visitRevoke(astNode: Revoke) : any;
  visitExecute(astNode: Execute) : any;
  visitRawCommand(astNode: RawCommand) : any;
}

export interface TriggerVisitor {
  visitLoad(astNode: Load) : any;
  visitTick(astNode: Tick) : any;
  visitCombinedTrigger(astNode: CombinedTrigger) : any;
  visitConsumeItem(astNode: ConsumeItem) : any;
  visitInventoryChanged(astNode: InventoryChanged) : any;
  visitRawTrigger(astNode: RawTrigger) : any;
}

export interface ItemSpecVisitor {
  visitItemMatcher(astNode: ItemMatcher) : any;
  visitTagMatcher(astNode: TagMatcher) : any;
}

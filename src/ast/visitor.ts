import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False } from "./ast";

export interface AstVisitor {
  visitImport(astNode: Import) : void;
  visitDefine(astNode: Define) : void;
  visitLet(astNode: Let) : void;
  visitIf(astNode: If) : void;
  visitFor(astNode: For) : void;
  visitPrint(astNode: Print) : void;
  visitBinop(astNode: Binop) : void;
  visitUnop(astNode: Unop) : void;
  visitIndex(astNode: Index) : void;
  visitSlice(astNode: Slice) : void;
  visitCall(astNode: Call) : void;
  visitList(astNode: List) : void;
  visitBegin(astNode: Begin) : void;
  visitOn(astNode: On) : void;
  visitAdvancement(astNode: Advancement) : void;
  visitFunction(astNode: Function) : void;
  visitTrue(astNode: True) : void;
  visitFalse(astNode: False) : void;
  visitNumber(astNode: Number) : void;
  visitString(astNode: String) : void;
}

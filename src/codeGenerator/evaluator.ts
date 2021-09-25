import { Import, Define, Let, If, For, Print, Binop, Unop, Index, Slice, Call, List, Begin, On, Advancement, True, False } from "../ast/ast";
import { AstVisitor } from "../ast/visitor";
import STORE from "./store"

export class Evaluator implements AstVisitor {
    visitImport(astNode: Import) : void{
        throw new Error("Method not implemented.");
    }
    visitDefine(astNode: Define) : void{
        throw new Error("Method not implemented.");
    }
    visitLet(astNode: Let) : void{
        throw new Error("Method not implemented.");
    }
    visitIf(astNode: If) : void{
        throw new Error("Method not implemented.");
    }
    visitFor(astNode: For) : void{
        throw new Error("Method not implemented.");
    }
    visitPrint(astNode: Print) : void{
        throw new Error("Method not implemented.");
    }
    visitBinop(astNode: Binop) : void{
        throw new Error("Method not implemented.");
    }
    visitUnop(astNode: Unop) : void{
        throw new Error("Method not implemented.");
    }
    visitIndex(astNode: Index) : void{
        throw new Error("Method not implemented.");
    }
    visitSlice(astNode: Slice) : void{
        throw new Error("Method not implemented.");
    }
    visitCall(astNode: Call) : void{
        throw new Error("Method not implemented.");
    }
    visitList(astNode: List) : void{
        throw new Error("Method not implemented.");
    }
    visitBegin(astNode: Begin) : void{
        throw new Error("Method not implemented.");
    }
    visitOn(astNode: On) : void{
        throw new Error("Method not implemented.");
    }
    visitAdvancement(astNode: Advancement) : void{
        throw new Error("Method not implemented.");
    }
    visitFunction(astNode: Function) : void{
        throw new Error("Method not implemented.");
    }
    visitTrue(astNode: True) : void{
        throw new Error("Method not implemented.");
    }
    visitFalse(astNode: False) : void{
        throw new Error("Method not implemented.");
    }
    visitNumber(astNode: Number) : void{
        throw new Error("Method not implemented.");
    }
    visitString(astNode: String) : void{
        throw new Error("Method not implemented.");
    }

}

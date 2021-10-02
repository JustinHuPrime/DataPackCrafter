import { ItemMatcher, ItemSpec, TagMatcher } from "../ast/ast";
import { ItemSpecVisitor } from "../ast/visitor";
import { Evaluator, EvaluatorEnv } from "./evaluator";
import * as Store from "./store";

export default class ItemSpecParser implements ItemSpecVisitor {
    private evaluator: Evaluator;
    private env: EvaluatorEnv;

    constructor(evaluator: Evaluator, env: EvaluatorEnv) {
        this.evaluator = evaluator;
        this.env = env;
    }

    parse(itemSpec: ItemSpec | null) {
        if (itemSpec == null) {
            return null;
        } else {
            return itemSpec.accept(this);
        }
    }

    visitItemMatcher(astNode: ItemMatcher): Store.ItemSpec {
        let str = this.evaluator.evaluateExpectType(astNode.name, this.env, "string", "advancement trigger item specification");
        return new Store.ItemMatcher(str);
    }
    visitTagMatcher(astNode: TagMatcher): Store.ItemSpec {
        let str = this.evaluator.evaluateExpectType(astNode.name, this.env, "string", "advancement trigger tag specification");
        return new Store.TagMatcher(str);
    }
}

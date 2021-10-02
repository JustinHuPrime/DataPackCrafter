import { Load, Tick, CombinedTrigger, ConsumeItem, InventoryChanged, RawTrigger, Trigger } from "../ast/ast";
import { TriggerVisitor } from "../ast/visitor";
import { Evaluator, EvaluatorEnv } from "./evaluator";
import { DSLSyntaxError } from "./exceptions";
import ItemSpecParser from "./itemSpecParser";
import * as Store from "./store";

export default class TriggerParser implements TriggerVisitor {
    private evaluator: Evaluator;
    private env: EvaluatorEnv;
    private itemSpecParser: ItemSpecParser;

    constructor(evaluator: Evaluator, env: EvaluatorEnv) {
        this.evaluator = evaluator;
        this.env = env;
        this.itemSpecParser = new ItemSpecParser(evaluator, env);
    }

    parse(trigger: Trigger): Store.Trigger[] {
        return trigger.accept(this);
    }
    visitLoad(astNode: Load) {
        throw new DSLSyntaxError(astNode, "load and tick triggers cannot be combined");
    }
    visitTick(astNode: Tick) {
        // FIXME: revisit this if we choose to implement tick triggers with an advancement
        throw new DSLSyntaxError(astNode, "load and tick triggers cannot be combined");
    }
    visitCombinedTrigger(astNode: CombinedTrigger): Store.Trigger[] {
        let results: Store.Trigger[] = [];
        results = results.concat(this.parse(astNode.lhs));
        results = results.concat(this.parse(astNode.rhs));
        return results;
    }
    visitConsumeItem(astNode: ConsumeItem): Store.Trigger[] {
        let itemSpec = this.itemSpecParser.parse(astNode.details);
        return [new Store.ConsumeItem(itemSpec)];
    }
    visitInventoryChanged(astNode: InventoryChanged): Store.Trigger[] {
        let itemSpec = this.itemSpecParser.parse(astNode.details);
        return [new Store.InventoryChanged(itemSpec)];
    }
    visitRawTrigger(astNode: RawTrigger): Store.Trigger[] {
        let result = this.evaluator.evaluateExpectType(astNode.name, this.env, "string", "raw trigger criteria");
        return [new Store.Raw(result)];
    }

}

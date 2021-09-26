import Span, { merge } from "./span";
import Token from "./token";

export abstract class Ast {
  span: Span;

  constructor(span: Span) {
    this.span = span;
  }
}

export class File extends Ast {
  datapackDecl: DatapackDecl;
  expressions: Expression[];

  constructor(datapackDecl: DatapackDecl, expressions: Expression[]) {
    const last = expressions.at(-1);
    if (last === undefined) super(datapackDecl.span);
    else super(merge(datapackDecl.span, last.span));

    this.datapackDecl = datapackDecl;
    this.expressions = expressions;
  }
}

export class DatapackDecl extends Ast {
  id: Id;

  constructor(keyword: Token, id: Id) {
    super(merge(keyword.span, id.span));
    this.id = id;
  }
}

export abstract class Expression extends Ast {}

export class Import extends Expression {
  target: Expression;

  constructor(keyword: Token, target: Expression) {
    super(merge(keyword.span, target.span));
    this.target = target;
  }
}

export class Define extends Expression {
  id: Id | null;
  args: Id[];
  body: Expression;

  constructor(keyword: Token, id: Id | null, args: Id[], body: Expression) {
    super(merge(keyword.span, body.span));
    this.id = id;
    this.args = args;
    this.body = body;
  }
}

export class Let extends Expression {
  ids: Id[];
  values: Expression[];
  body: Expression;

  constructor(
    keyword: Token,
    ids: Id[],
    values: Expression[],
    body: Expression,
  ) {
    // assert(ids.length === values.length, "ids wasn't as long as values");
    // assert(ids.length >= 1, "we don't have any bound variables");

    super(merge(keyword.span, body.span));
    this.ids = ids;
    this.values = values;
    this.body = body;
  }
}

export class If extends Expression {
  predicate: Expression;
  consequent: Expression;
  alternative: Expression;

  constructor(
    keyword: Token,
    predicate: Expression,
    consequent: Expression,
    alternative: Expression,
  ) {
    super(merge(keyword.span, alternative.span));
    this.predicate = predicate;
    this.consequent = consequent;
    this.alternative = alternative;
  }
}

export class For extends Expression {
  id: Id;
  iterable: Expression;
  body: Expression;

  constructor(keyword: Token, id: Id, iterable: Expression, body: Expression) {
    super(merge(keyword.span, body.span));
    this.id = id;
    this.iterable = iterable;
    this.body = body;
  }
}

export class Print extends Expression {
  expression: Expression;

  constructor(keyword: Token, expression: Expression) {
    super(merge(keyword.span, expression.span));
    this.expression = expression;
  }
}

export enum BinaryOperator {
  AND,
  OR,
  EQ,
  NEQ,
  LT,
  GT,
  LTE,
  GTE,
  ADD,
  SUB,
  MUL,
  DIV,
  MOD,
}

export class Binop extends Expression {
  lhs: Expression;
  op: BinaryOperator;
  rhs: Expression;

  constructor(lhs: Expression, op: BinaryOperator, rhs: Expression) {
    super(merge(lhs.span, rhs.span));
    this.lhs = lhs;
    this.op = op;
    this.rhs = rhs;
  }
}

export enum UnaryOperator {
  NOT,
  NEG,
}

export class Unop extends Expression {
  op: UnaryOperator;
  target: Expression;

  constructor(punctuation: Token, op: UnaryOperator, target: Expression) {
    super(merge(punctuation.span, target.span));
    this.op = op;
    this.target = target;
  }
}

export class Index extends Expression {
  target: Expression;
  index: Expression;

  constructor(target: Expression, index: Expression, closeParen: Token) {
    super(merge(target.span, closeParen.span));
    this.target = target;
    this.index = index;
  }
}

export class Slice extends Expression {
  target: Expression;
  from: Expression | null;
  to: Expression | null;

  constructor(
    target: Expression,
    from: Expression | null,
    to: Expression | null,
    closeParen: Token,
  ) {
    // assert(!(from === null && to === null), "both from and to were null");

    super(merge(target.span, closeParen.span));
    this.target = target;
    this.from = from;
    this.to = to;
  }
}

export class Call extends Expression {
  target: Expression;
  args: Expression[];

  constructor(target: Expression, args: Expression[], closeParen: Token) {
    super(merge(target.span, closeParen.span));
    this.target = target;
    this.args = args;
  }
}

export class List extends Expression {
  elements: Expression[];

  constructor(leftSquare: Token, elements: Expression[], rightSquare: Token) {
    super(merge(leftSquare.span, rightSquare.span));
    this.elements = elements;
  }
}

export class Begin extends Expression {
  elements: Expression[];

  constructor(leftSquare: Token, elements: Expression[], rightSquare: Token) {
    super(merge(leftSquare.span, rightSquare.span));
    this.elements = elements;
  }
}

export class On extends Expression {
  trigger: Trigger;
  commands: Command[];

  constructor(
    keyword: Token,
    trigger: Trigger,
    commands: Command[],
    closeBrace: Token,
  ) {
    super(merge(keyword.span, closeBrace.span));
    this.trigger = trigger;
    this.commands = commands;
  }
}

export class Advancement extends Expression {
  name: Expression | null;
  details: AdvancementSpec[];

  constructor(
    keyword: Token,
    name: Expression | null,
    details: AdvancementSpec[],
    closeBrace: Token,
  ) {
    super(merge(keyword.span, closeBrace.span));
    this.name = name;
    this.details = details;
  }
}

export class Function extends Expression {
  name: Expression | null;
  commands: Command[];

  constructor(
    keyword: Token,
    name: Expression | null,
    commands: Command[],
    closeBrace: Token,
  ) {
    super(merge(keyword.span, closeBrace.span));
    this.name = name;
    this.commands = commands;
  }
}

export class True extends Expression {
  constructor(token: Token) {
    super(token.span);
  }
}

export class False extends Expression {
  constructor(token: Token) {
    super(token.span);
  }
}

export abstract class Command extends Ast {}

export class Grant extends Command {
  name: Expression;

  constructor(keyword: Token, name: Expression) {
    super(merge(keyword.span, name.span));
    this.name = name;
  }
}

export class Revoke extends Command {
  name: Expression;

  constructor(keyword: Token, name: Expression) {
    super(merge(keyword.span, name.span));
    this.name = name;
  }
}

export class Execute extends Command {
  name: Expression;

  constructor(keyword: Token, name: Expression) {
    super(merge(keyword.span, name.span));
    this.name = name;
  }
}

export class RawCommand extends Command {
  command: Expression;

  constructor(command: Expression) {
    super(command.span);
    this.command = command;
  }
}

export abstract class Trigger extends Ast {}

export class Load extends Trigger {
  constructor(token: Token) {
    super(token.span);
  }
}

export class Tick extends Trigger {
  constructor(token: Token) {
    super(token.span);
  }
}

export class CombinedTrigger extends Trigger {
  lhs: Trigger;
  rhs: Trigger;

  constructor(lhs: Trigger, rhs: Trigger) {
    super(merge(lhs.span, rhs.span));
    this.lhs = lhs;
    this.rhs = rhs;
  }
}

export class ConsumeItem extends Trigger {
  details: ItemSpec[];

  constructor(keyword: Token, details: ItemSpec[], closeBrace: Token) {
    super(merge(keyword.span, closeBrace.span));
    this.details = details;
  }
}

export class InventoryChanged extends Trigger {
  details: ItemSpec[];

  constructor(keyword: Token, details: ItemSpec[], closeBrace: Token) {
    super(merge(keyword.span, closeBrace.span));
    this.details = details;
  }
}

export class RawTrigger extends Trigger {
  name: Expression;

  constructor(name: Expression) {
    super(name.span);
    this.name = name;
  }
}

export abstract class ItemSpec extends Ast {}

export class ItemMatcher extends ItemSpec {
  name: Expression;

  constructor(keyword: Token, name: Expression) {
    super(merge(keyword.span, name.span));
    this.name = name;
  }
}

export class TagMatcher extends ItemSpec {
  name: Expression;

  constructor(keyword: Token, name: Expression) {
    super(merge(keyword.span, name.span));
    this.name = name;
  }
}

export abstract class AdvancementSpec extends Ast {}

export class Title extends AdvancementSpec {
  title: Expression;

  constructor(keyword: Token, title: Expression) {
    super(merge(keyword.span, title.span));
    this.title = title;
  }
}

export class Icon extends AdvancementSpec {
  icon: Expression;

  constructor(keyword: Token, icon: Expression) {
    super(merge(keyword.span, icon.span));
    this.icon = icon;
  }
}

export class Description extends AdvancementSpec {
  description: Expression;

  constructor(keyword: Token, description: Expression) {
    super(merge(keyword.span, description.span));
    this.description = description;
  }
}

export class Parent extends AdvancementSpec {
  parent: Expression;

  constructor(keyword: Token, parent: Expression) {
    super(merge(keyword.span, parent.span));
    this.parent = parent;
  }
}

export class Id extends Expression {
  id: string;

  constructor(token: Token) {
    super(token.span);
    this.id = token.content;
  }
}

export class Number extends Expression {
  value: number;
  constructor(token: Token) {
    // assert(!isNaN(parseFloat(token.content)), "couldn't parse number");

    super(token.span);
    this.value = parseFloat(token.content);
  }
}

export class String extends Expression {
  components: (string | Expression)[];

  constructor(
    leftQuote: Token,
    components: (string | Expression)[],
    rightQuote: Token,
  ) {
    super(merge(leftQuote.span, rightQuote.span));
    this.components = components;
  }
}

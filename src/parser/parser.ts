import {
  Advancement,
  AdvancementSpec,
  ASTNumber,
  ASTString,
  Begin,
  BinaryOperator,
  Binop,
  Call,
  CombinedTrigger,
  Command,
  ConsumeItem,
  DatapackDecl,
  Define,
  Description,
  Execute,
  Expression,
  False,
  File,
  For,
  Grant,
  Icon,
  Id,
  If,
  Index,
  InventoryChanged,
  ItemMatcher,
  ItemSpec,
  Let,
  List,
  Load,
  MCFunction,
  On,
  Parent,
  Print,
  RawCommand,
  RawTrigger,
  Revoke,
  Slice,
  TagMatcher,
  Tick,
  Title,
  Trigger,
  True,
  UnaryOperator,
  Unop,
} from "../ast/ast";
import Token, { TokenType } from "../ast/token";
import Lexer from "./lexer";

export default class Parser {
  private filename: string;
  private lexer: Lexer;

  constructor(filename: string) {
    this.filename = filename;
    this.lexer = new Lexer(filename);
  }

  private throwUnexpectedCharacterError(token: Token): never {
    const { content, span } = token;
    const { start } = span;
    const { line, character } = start;

    throw new ParserError(
      `${this.filename}: ${line}:${character}: unexpected token '${content}`,
    );
  }

  private parseDatapackDeclaration(): DatapackDecl {
    const datapackToken: Token = this.lexer.lexRegular();
    this.expect(datapackToken, TokenType.LITERAL, "datapack");

    const id = this.parseId();

    return new DatapackDecl(datapackToken, id);
  }

  private parseId(): Id {
    const token: Token = this.lexer.lexRegular();
    this.expect(token, TokenType.ID);

    return new Id(token);
  }

  private parseTrue(): True {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "true");

    return new True(keyword);
  }

  private parseFalse(): False {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "false");

    return new False(keyword);
  }

  private parseString(): ASTString {
    const leftQuote = this.lexer.lexRegular();
    this.expect(leftQuote, TokenType.LITERAL, '"');

    const components: (string | Expression)[] = [];

    let current = this.lexer.lexString();

    while (!(current.type === TokenType.LITERAL && current.content === '"')) {
      if (current.type === TokenType.STRING_CHAR) {
        components.push(current.content);
      } else if (
        current.type === TokenType.LITERAL &&
        current.content === "{"
      ) {
        components.push(this.parseExpression());
        this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "}");
      } else {
        this.throwUnexpectedCharacterError(current);
      }

      current = this.lexer.lexString();
    }

    return new ASTString(leftQuote, components, current);
  }

  private parseNumber(): ASTNumber {
    const token = this.lexer.lexRegular();
    this.expect(token, TokenType.NUMBER);

    return new ASTNumber(token);
  }

  private parseFunction(): MCFunction {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "function");

    let peek = this.lexer.lexRegular();
    let name = null;
    if (peek.content === "(") {
      name = this.parseExpression();
      this.expect(this.lexer.lexRegular(), TokenType.LITERAL, ")");
    } else {
      this.lexer.unlex(peek);
    }

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    const commands = [];

    peek = this.lexer.lexRegular();
    while (peek.content !== "}") {
      this.lexer.unlex(peek);
      commands.push(this.parseCommand());
      peek = this.lexer.lexRegular();
    }

    return new MCFunction(keyword, name, commands, peek);
  }

  private parseAdvancement(): Advancement {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "advancement");

    let peek = this.lexer.lexRegular();
    let name = null;
    if (peek.content === "(") {
      name = this.parseExpression();
      this.expect(this.lexer.lexRegular(), TokenType.LITERAL, ")");
    } else {
      this.lexer.unlex(peek);
    }

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    const commands = [];
    peek = this.lexer.lexRegular();
    while (peek.content !== "}") {
      this.lexer.unlex(peek);
      commands.push(this.parseAdvancementSpec());
      peek = this.lexer.lexRegular();
    }

    return new Advancement(keyword, name, commands, peek);
  }

  private parseItemSpec(): ItemSpec {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, ["item", "tag"]);

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "==");

    const name: Expression = this.parseExpression();

    if (start.content === "item") return new ItemMatcher(start, name);
    else return new TagMatcher(start, name);
  }

  private parseAdvancementSpec(): AdvancementSpec {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, [
      "title",
      "icon",
      "description",
      "parent",
    ]);

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "=");

    const expression = this.parseExpression();

    switch (keyword.content) {
      case "title": {
        return new Title(keyword, expression);
      }
      case "icon": {
        return new Icon(keyword, expression);
      }
      case "description": {
        return new Description(keyword, expression);
      }
      default: {
        return new Parent(keyword, expression);
      }
    }
  }

  private parseBaseCommand(): Command {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, ["grant", "revoke", "execute"]);

    const expression = this.parseExpression();

    const { content } = start;

    switch (content) {
      case "grant":
        return new Grant(start, expression);
      case "revoke":
        return new Revoke(start, expression);
      default:
        return new Execute(start, expression);
    }
  }

  private parseCommand(): Command {
    const keyword = this.lexer.lexRegular();

    const { content } = keyword;

    this.lexer.unlex(keyword);
    switch (content) {
      case "grant":
      case "revoke":
      case "execute":
        return this.parseBaseCommand();
      default:
        return new RawCommand(this.parseExpression());
    }
  }

  private parseBasePrimaryTrigger(): InventoryChanged | ConsumeItem {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, [
      "inventory_changed",
      "consume_item",
    ]);

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    let currentToken = this.lexer.lexRegular();
    let itemSpec: ItemSpec | null = null;

    if (currentToken.content !== "}") {
      this.lexer.unlex(currentToken);
      itemSpec = this.parseItemSpec();
      currentToken = this.lexer.lexRegular();
    }

    this.expect(currentToken, TokenType.LITERAL, "}");

    const { content } = start;
    if (content === "inventory_changed") {
      return new InventoryChanged(start, itemSpec, currentToken);
    } else {
      return new ConsumeItem(start, itemSpec, currentToken);
    }
  }

  private parsePrimaryTrigger(): Trigger {
    const start = this.lexer.lexRegular();
    this.lexer.unlex(start);

    const { content } = start;
    if (content === "consume_item" || content === "inventory_changed") {
      return this.parseBasePrimaryTrigger();
    } else {
      return new RawTrigger(this.parseExpression());
    }
  }

  private parseCombinedTrigger(): Trigger {
    let lhs = this.parsePrimaryTrigger();

    let peek = this.lexer.lexRegular();
    while (peek.content === "||") {
      lhs = new CombinedTrigger(lhs, this.parsePrimaryTrigger());
      peek = this.lexer.lexRegular();
    }
    this.lexer.unlex(peek);

    return lhs;
  }

  private parseTrigger(): Trigger {
    const start = this.lexer.lexRegular();
    if (start.content === "load") {
      return new Load(start);
    } else if (start.content === "tick") {
      return new Tick(start);
    } else {
      this.lexer.unlex(start);
      return this.parseCombinedTrigger();
    }
  }

  private parseOn(): On {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "on");

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "(");

    const trigger = this.parseTrigger();

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, ")");
    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    const commands: Command[] = [];

    let current = this.lexer.lexRegular();
    while (current.content !== "}") {
      this.lexer.unlex(current);
      commands.push(this.parseCommand());
      current = this.lexer.lexRegular();
    }

    return new On(start, trigger, commands, current);
  }

  private parseBegin(): Begin {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "{");

    const elements: Expression[] = [this.parseExpression()];

    let peek = this.lexer.lexRegular();
    while (peek.content !== "}") {
      this.lexer.unlex(peek);
      elements.push(this.parseExpression());
      peek = this.lexer.lexRegular();
    }

    return new Begin(start, elements, peek);
  }

  private parseList(): List {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "[");

    const list: Expression[] = [];
    let peek = this.lexer.lexRegular();
    if (peek.content === "]") {
      return new List(start, list, peek);
    }

    this.lexer.unlex(peek);

    let done = false;
    while (!done) {
      list.push(this.parseExpression());
      peek = this.lexer.lexRegular();
      switch (peek.content) {
        case ",": {
          break;
        }
        case "]": {
          done = true;
          break;
        }
        default: {
          this.throwUnexpectedCharacterError(peek);
        }
      }
    }

    return new List(start, list, peek);
  }

  private parseBracketExpression(): Expression {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "(");

    const expression = this.parseExpression();

    const end = this.lexer.lexRegular();
    this.expect(end, TokenType.LITERAL, ")");

    return expression;
  }

  private parseLogicalExpression(): Expression {
    let lhs = this.parseEqualityExpression();

    let peek = this.lexer.lexRegular();
    while (peek.content === "&&" || peek.content === "||") {
      const rhs = this.parseEqualityExpression();
      lhs = new Binop(
        lhs,
        peek.content === "&&" ? BinaryOperator.AND : BinaryOperator.OR,
        rhs,
      );

      peek = this.lexer.lexRegular();
    }
    this.lexer.unlex(peek);

    return lhs;
  }

  private parseEqualityExpression(): Expression {
    let lhs = this.parseRelationalExpression();

    let peek = this.lexer.lexRegular();
    while (peek.content === "==" || peek.content === "!=") {
      const rhs = this.parseRelationalExpression();
      lhs = new Binop(
        lhs,
        peek.content === "==" ? BinaryOperator.EQ : BinaryOperator.NEQ,
        rhs,
      );
      peek = this.lexer.lexRegular();
    }
    this.lexer.unlex(peek);

    return lhs;
  }

  private parseRelationalExpression(): Expression {
    let lhs = this.parseAdditiveExpression();

    let peek = this.lexer.lexRegular();
    while (
      peek.content === "<" ||
      peek.content === ">" ||
      peek.content === "<=" ||
      peek.content === ">="
    ) {
      const rhs = this.parseAdditiveExpression();
      switch (peek.content) {
        case "<": {
          lhs = new Binop(lhs, BinaryOperator.LT, rhs);
          break;
        }
        case ">": {
          lhs = new Binop(lhs, BinaryOperator.GT, rhs);
          break;
        }
        case "<=": {
          lhs = new Binop(lhs, BinaryOperator.LTE, rhs);
          break;
        }
        case ">=": {
          lhs = new Binop(lhs, BinaryOperator.GTE, rhs);
          break;
        }
      }
      peek = this.lexer.lexRegular();
    }
    this.lexer.unlex(peek);

    return lhs;
  }

  private parseAdditiveExpression(): Expression {
    let lhs = this.parseMultiplicativeExpression();

    let peek = this.lexer.lexRegular();
    while (peek.content === "+" || peek.content === "-") {
      const rhs = this.parseMultiplicativeExpression();
      lhs = new Binop(
        lhs,
        peek.content === "+" ? BinaryOperator.ADD : BinaryOperator.SUB,
        rhs,
      );
      peek = this.lexer.lexRegular();
    }

    this.lexer.unlex(peek);

    return lhs;
  }

  private parseMultiplicativeExpression(): Expression {
    let lhs = this.parsePrefixExpression();

    let peek = this.lexer.lexRegular();
    while (
      peek.content === "*" ||
      peek.content === "/" ||
      peek.content === "%"
    ) {
      const rhs = this.parsePrefixExpression();
      switch (peek.content) {
        case "*": {
          lhs = new Binop(lhs, BinaryOperator.MUL, rhs);
          break;
        }
        case "/": {
          lhs = new Binop(lhs, BinaryOperator.DIV, rhs);
          break;
        }
        case "%": {
          lhs = new Binop(lhs, BinaryOperator.MOD, rhs);
          break;
        }
      }

      peek = this.lexer.lexRegular();
    }

    this.lexer.unlex(peek);

    return lhs;
  }

  private parsePrefixExpression(): Expression {
    const token = this.lexer.lexRegular();
    const { content } = token;

    switch (content) {
      case "!":
        return new Unop(token, UnaryOperator.NOT, this.parsePrefixExpression());
      case "-":
        return new Unop(token, UnaryOperator.NEG, this.parsePrefixExpression());
      default:
        this.lexer.unlex(token);
        return this.parsePostfixExpression();
    }
  }

  private parseCall(target: Expression): Expression {
    const begin = this.lexer.lexRegular();
    this.expect(begin, TokenType.LITERAL, "(");

    const args: Expression[] = [];

    let peek = this.lexer.lexRegular();
    if (peek.content === ")") return new Call(target, args, peek);
    this.lexer.unlex(peek);

    let done = false;
    while (!done) {
      args.push(this.parseExpression());
      peek = this.lexer.lexRegular();
      switch (peek.content) {
        case ",": {
          break;
        }
        case ")": {
          done = true;
          break;
        }
        default: {
          this.throwUnexpectedCharacterError(peek);
        }
      }
    }

    return new Call(target, args, peek);
  }

  private parseSlice(target: Expression): Expression {
    const begin = this.lexer.lexRegular();
    this.expect(begin, TokenType.LITERAL, "[");

    let peek = this.lexer.lexRegular();
    if (peek.content === ":") {
      const to = this.parseExpression();

      const closeSquare = this.lexer.lexRegular();
      this.expect(closeSquare, TokenType.LITERAL, "]");
      return new Slice(target, null, to, closeSquare);
    } else {
      this.lexer.unlex(peek);

      const from = this.parseExpression();

      peek = this.lexer.lexRegular();
      if (peek.content === ":") {
        peek = this.lexer.lexRegular();
        if (peek.content === "]") {
          return new Slice(target, from, null, peek);
        }
        this.lexer.unlex(peek);

        const to = this.parseExpression();

        const closeSquare = this.lexer.lexRegular();
        this.expect(closeSquare, TokenType.LITERAL, "]");
        return new Slice(target, from, to, closeSquare);
      } else {
        this.lexer.unlex(peek);

        const closeSquare = this.lexer.lexRegular();
        this.expect(closeSquare, TokenType.LITERAL, "]");
        return new Index(target, from, closeSquare);
      }
    }
  }

  private parsePostfixExpression(): Expression {
    let target = this.parsePrimaryExpression();

    let peek = this.lexer.lexRegular();
    while (peek.content === "[" || peek.content === "(") {
      this.lexer.unlex(peek);
      if (peek.content === "[") {
        target = this.parseSlice(target);
      } else {
        target = this.parseCall(target);
      }
      peek = this.lexer.lexRegular();
    }

    this.lexer.unlex(peek);
    return target;
  }

  private parsePrimaryExpression(): Expression {
    const token = this.lexer.lexRegular();
    this.lexer.unlex(token);
    switch (token.type) {
      case TokenType.LITERAL: {
        switch (token.content) {
          case "(": {
            return this.parseBracketExpression();
          }
          case "[": {
            return this.parseList();
          }
          case "{": {
            return this.parseBegin();
          }
          case "on": {
            return this.parseOn();
          }
          case "advancement": {
            return this.parseAdvancement();
          }
          case "function": {
            return this.parseFunction();
          }
          case '"': {
            return this.parseString();
          }
          case "true": {
            return this.parseTrue();
          }
          case "false": {
            return this.parseFalse();
          }
          default: {
            this.throwUnexpectedCharacterError(token);
          }
        }
      }
      case TokenType.ID: {
        return this.parseId();
      }
      case TokenType.NUMBER: {
        return this.parseNumber();
      }
      default: {
        this.throwUnexpectedCharacterError(token);
      }
    }
  }

  private parseDefine(): Expression {
    const keyword = this.lexer.lexRegular();

    this.expect(keyword, TokenType.LITERAL, "define");

    const identifierToken = this.lexer.lexRegular();
    this.lexer.unlex(identifierToken);

    let id: Id | null = null;
    if (identifierToken.type === TokenType.ID) {
      id = this.parseId();
    }

    const openParan = this.lexer.lexRegular();
    this.expect(openParan, TokenType.LITERAL, "(");

    let peek = this.lexer.lexRegular();
    let args: Id[] = [];
    let doneArgs = false;
    if (peek.content !== ")") {
      this.lexer.unlex(peek);
    } else {
      doneArgs = true;
    }
    while (!doneArgs) {
      peek = this.lexer.lexRegular();
      switch (peek.type) {
        case TokenType.ID: {
          this.lexer.unlex(peek);
          args.push(this.parseId());

          peek = this.lexer.lexRegular();
          switch (peek.content) {
            case ",": {
              break;
            }
            case ")": {
              doneArgs = true;
              break;
            }
            default: {
              this.throwUnexpectedCharacterError(peek);
            }
          }
          break;
        }
        default: {
          this.throwUnexpectedCharacterError(peek);
        }
      }
    }

    const body = this.parseExpression();

    return new Define(keyword, id, args, body);
  }

  private parseLet(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "let");

    const ids: Id[] = [];
    const values: Expression[] = [];

    const id0 = this.lexer.lexRegular();
    this.expect(id0, TokenType.ID);

    const eq0 = this.lexer.lexRegular();
    this.expect(eq0, TokenType.LITERAL, "=");

    const v0 = this.parseExpression();

    ids.push(new Id(id0));
    values.push(v0);

    let current = this.lexer.lexRegular();
    while (current.content === ",") {
      current = this.lexer.lexRegular();
      this.expect(current, TokenType.ID);

      const id = new Id(current);

      current = this.lexer.lexRegular();
      this.expect(current, TokenType.LITERAL, "=");

      const value = this.parseExpression();

      ids.push(id);
      values.push(value);

      current = this.lexer.lexRegular();
    }
    this.lexer.unlex(current);

    const body = this.parseExpression();

    return new Let(keyword, ids, values, body);
  }

  private parseIf(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "if");

    const predicate = this.parseExpression();

    const thenToken = this.lexer.lexRegular();
    this.expect(thenToken, TokenType.LITERAL, "then");

    const consequent = this.parseExpression();

    const elseToken = this.lexer.lexRegular();
    this.expect(elseToken, TokenType.LITERAL, "else");

    const alternative = this.parseExpression();

    return new If(keyword, predicate, consequent, alternative);
  }

  private parseFor(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "for");

    const id = this.parseId();

    const inToken = this.lexer.lexRegular();
    this.expect(inToken, TokenType.LITERAL, "in");

    const iterable = this.parseExpression();
    const body = this.parseExpression();

    return new For(keyword, id, iterable, body);
  }

  private parsePrint(): Expression {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, "print");

    const expression = this.parseExpression();

    return new Print(keyword, expression);
  }

  private parseExpression(): Expression {
    const next = this.lexer.lexRegular();
    this.lexer.unlex(next);
    switch (next.type) {
      case TokenType.LITERAL: {
        switch (next.content) {
          case "define": {
            return this.parseDefine();
          }
          case "let": {
            return this.parseLet();
          }
          case "if": {
            return this.parseIf();
          }
          case "for": {
            return this.parseFor();
          }
          case "print": {
            return this.parsePrint();
          }
          default: {
            return this.parseLogicalExpression();
          }
        }
      }
      default: {
        return this.parseLogicalExpression();
      }
    }
  }

  private expect(
    token: Token,
    tokenType: TokenType,
    value?: string | string[],
  ): void {
    const { type, content } = token;

    let meetValueCriteria = true;

    if (value) {
      if (typeof value === "string") {
        meetValueCriteria = value === content;
      } else {
        meetValueCriteria = value.includes(content);
      }
    }

    if (type !== tokenType || !meetValueCriteria) {
      this.throwUnexpectedCharacterError(token);
    }
  }

  parse(): File {
    const expressions: Expression[] = [];
    const datapackDecl: DatapackDecl = this.parseDatapackDeclaration();

    let currentToken: Token = this.lexer.lexRegular();
    while (currentToken.type !== TokenType.EOF) {
      this.lexer.unlex(currentToken);
      expressions.push(this.parseExpression());
      currentToken = this.lexer.lexRegular();
    }

    return new File(datapackDecl, expressions);
  }
}

export class ParserError extends Error {}

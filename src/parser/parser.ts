import {
  Advancement,
  AdvancementSpec,
  ASTNumber,
  ASTString,
  Begin,
  CombinedTrigger,
  Command,
  ConsumeItem,
  DatapackDecl,
  Define, Description, Execute,
  Expression,
  False,
  File,
  For, Grant, Icon,
  Id,
  If,
  Import,
  InventoryChanged,
  ItemMatcher,
  ItemSpec,
  Let,
  List,
  Load,
  MCFunction,
  On, Parent,
  Print, RawCommand,
  RawTrigger, Revoke,
  TagMatcher,
  Tick, Title,
  Trigger,
  True,
} from "../ast/ast";
import Options from "../options";
import Token, { TokenType } from "../ast/token";
import Lexer from "./lexer";

export default class Parser {
  private filename: string;
  private lexer: Lexer;
  options: Options;

  constructor(filename: string, options: Options) {
    this.filename = filename;
    this.options = options;
    this.lexer = new Lexer(filename);
  }

  private throwUnexpectedCharacterError(token: Token): void {
    throw this.buildUnexpectedCharacterError(token);
  }

  private buildUnexpectedCharacterError(token: Token): ParserError {
    const { content, span } = token;
    const { start } = span;
    const { line, character } = start;

    return new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
  }

  private parseDatapackDeclaration (): DatapackDecl {
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

  private parseImport() : Import  {
    const keyword  = this.lexer.lexRegular();
    // has to be an import
    this.expect(keyword, TokenType.LITERAL, "import");

    const target = this.parseExpression();

    return new Import(keyword, target);
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

    let stringBuilder = "";

    let current = this.lexer.lexString();

    while (current.content !== '"') {
      if (current.type === TokenType.STRING_CHAR) {
        stringBuilder += current.content;
      } else if (current.type === TokenType.LITERAL && current.content === "{") {
        components.push(stringBuilder);
        stringBuilder = "";
        components.push(this.parseExpression());
      } else if (current.type === TokenType.EOF) {
        this.throwUnexpectedCharacterError(current);
      }

      current = this.lexer.lexString();
    }

    if (stringBuilder.length > 0) {
      components.push(stringBuilder);
    }

    return new ASTString(leftQuote, components, current);
  }

  private parseNumber(): ASTNumber {
    const token = this.lexer.lexRegular();
    this.expect(token, TokenType.NUMBER);

    return new ASTNumber(token);
  }

  private parseFunction(): MCFunction {
    throw new Error("not implemented yet");
  }

  private parseAdvancement(): Advancement {
    throw new Error("not implemented yet");
  }

  private parseItemSpec(): ItemSpec {
    const start = this.lexer.lexRegular();

    this.expect(start, TokenType.LITERAL, ["item", "tag"]);

    const { content } = start;

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    const name: Expression = this.parseExpression();

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "}");

    if (content === "item") {
      return new ItemMatcher(start, name);
    } else {
      return new TagMatcher(start, name);
    }
  }

  private parseAdvancementSpec(): AdvancementSpec {
    const keyword = this.lexer.lexRegular();
    this.expect(keyword, TokenType.LITERAL, ["title", "icon", "description", "parent"]);

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "=");

    const expression = this.parseExpression();

    const { content } = keyword;

    switch (content) {
      case "title":
        return new Title(keyword, expression);
      case "icon":
        return new Icon(keyword, expression);
      case "description":
        return new Description(keyword, expression);
      default:
        return new Parent(keyword, expression);
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

    switch (content) {
      case "grant":
      case "revoke":
      case "execute":
        this.lexer.lexRegular();
        return this.parseBaseCommand();
      default:
        return new RawCommand(this.parseExpression());
    }
  }

  private parseBasePrimaryTrigger(): InventoryChanged | ConsumeItem {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, ["inventory_changed", "consume_item"]);

    this.expect(this.lexer.lexRegular(), TokenType.LITERAL, "{");

    let currentToken = this.lexer.lexRegular();
    const itemSpecs: ItemSpec[] = []

    if (currentToken.content !== '}') {
      this.lexer.unlex(currentToken);
      itemSpecs.push(this.parseItemSpec());
      currentToken = this.lexer.lexRegular();
    }

    const { content } = start;

    if (content === "inventory_changed") {
      return new InventoryChanged(start, itemSpecs, currentToken);
    } else {
      return new ConsumeItem(start, itemSpecs, currentToken);
    }
  }

  private parsePrimaryTrigger(): Trigger {
    const start = this.lexer.lexRegular();

    const { content } = start;

    if (content === 'consume_item' || content === 'inventory_changed') {
      this.lexer.unlex(start);

      this.parseBasePrimaryTrigger();
    }

    return new RawTrigger(this.parseExpression());
  }

  private parseCombinedTrigger(): Trigger {
    const lhs = this.parsePrimaryTrigger();

    const next = this.lexer.lexRegular();
    const { content } = next;

    if (content !== '||') {
      this.lexer.unlex(next);
      return lhs;
    }

    const rhs = this.parseCombinedTrigger();

    return new CombinedTrigger(lhs, rhs);
  }

  private parseTrigger(): Trigger {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, ["load", "tick"]);

    const { content } = start;

    if (content === 'load') {
      return new Load(start);
    } else if (content === 'tick') {
      return new Tick(start);
    }

    return this.parseCombinedTrigger();
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
      commands.push(this.parseCommand());
    }

    return new On(start, trigger, commands, current);
  }

  private parseBegin(): Begin {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "{");

    const elements: Expression[] = [];

    let current = this.lexer.lexRegular();

    while (current.content !== "]") {
      if (current.type === TokenType.EOF) {
        this.throwUnexpectedCharacterError(current);
      }

      elements.push(this.parseExpression());
    }

    if (elements.length === 0) {
      this.throwUnexpectedCharacterError(current);
    }

    return new Begin(start, elements, current);
  }

  private parseList(): List {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "[");
    const list: Expression[] = [];

    const first = this.parseExpression();
    list.push(first);

    let current = this.lexer.lexRegular();
    let itemFlag = true;

    while (current.content !== ']') {
      if (current.type === TokenType.LITERAL && itemFlag) {
        this.expect(current, TokenType.LITERAL, ',');
        itemFlag = false;
      } else if (current.type === TokenType.EOF) {
        this.throwUnexpectedCharacterError(current);
      } else {
        const expression = this.parseExpression();
        list.push(expression);
        itemFlag = true;
      }
    }

    return new List(start, list, current);
  }

  private parseBracketExpression(): Expression {
    const start = this.lexer.lexRegular();
    this.expect(start, TokenType.LITERAL, "(");

    const expression = this.parseExpression();

    const end = this.lexer.lexRegular();
    this.expect(end, TokenType.LITERAL, ")");

    return expression;
  }

  // @ts-ignore
  private parsePostfixExpression(): Expression {
    const lhs = this.parsePrimaryExpression();

    const next = this.lexer.lexRegular();
    const { content } = next;

    // TODO: Postfix expression can have unlimited sequences...how to handle???
    switch (content) {
      case "[":
        this.lexer.unlex(next);
        break;
      case "(":
        this.lexer.unlex(next);
        break;
      default:
        return lhs;
    }
  }


  private parsePrimaryExpression(): Expression {
    const token = this.lexer.lexRegular();
    this.lexer.unlex(token);
    switch (token.type) {
      case TokenType.LITERAL:
        switch (token.content) {
          case "(":
            return this.parseBracketExpression()
          case "[":
            return this.parseList();
          case "{":
            return this.parseBegin();
          case "on":
            return this.parseOn();
          case "advancement":
            return this.parseAdvancement();
          case "function":
            return this.parseFunction();
          case '"':
            return this.parseString();
          case "true":
            return this.parseTrue();
          case "false":
            return this.parseFalse();
          default:
            this.throwUnexpectedCharacterError(token);
            break;
        }
          break;
      case TokenType.ID:
        return this.parseId();
      case TokenType.NUMBER:
        return this.parseNumber();
      default:
        break;
    }

    throw this.buildUnexpectedCharacterError(token);
  }

  private parseLogicalExpression(): Expression {
    throw new Error("not implemented yet");
  }

  private parseDefine(): Expression {
    const keyword = this.lexer.lexRegular();
    let id: Id | null = null;
    const args: Id[] = [];

    this.expect(keyword, TokenType.LITERAL, "import");

    const identifierToken = this.lexer.lexRegular();
    this.lexer.unlex(identifierToken);

    if (identifierToken.type === TokenType.ID) {
      id = this.parseId();
    }

    const openParan = this.lexer.lexRegular();

    this.expect(openParan, TokenType.LITERAL, "(");

    let current = this.lexer.lexRegular();
    let idFlag = false;
    while (current.content !== ")") {
      const { type } = current;
      switch (type) {
        case TokenType.ID:
          this.lexer.unlex(current);
          const id = this.parseId();
          args.push(id);
          idFlag = true;
          break;
        case TokenType.LITERAL:
          if (idFlag) {
            this.expect(current, TokenType.LITERAL, ",");
            idFlag = false;
          } else {
            this.throwUnexpectedCharacterError(current);
          }
          break;
        default:
          this.throwUnexpectedCharacterError(current);
          break;
      }
      current = this.lexer.lexRegular();
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
    this.expect(keyword, TokenType.ID);

    const eq1 = this.lexer.lexRegular();
    this.expect(eq1, TokenType.LITERAL, "=");

    const v1 = this.parseExpression();

    ids.push(new Id(id0));
    values.push(v1);

    let current = this.lexer.lexRegular();

    while (current.content === ',') {
      current = this.lexer.lexRegular();
      this.expect(current, TokenType.ID);

      const id = new Id(current);

      current = this.lexer.lexRegular();
      this.expect(current, TokenType.LITERAL, "=");

      const value = this.parseExpression();

      ids.push(id);
      values.push(value);

      this.lexer.lexRegular();
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

  private parseExpression() : Expression {
    const next = this.lexer.lexRegular();
    this.lexer.unlex(next);
    switch (next.type) {
      case TokenType.LITERAL: {
        switch (next.content) {
          case "import": {
            return this.parseImport();
          }
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
        }
        break;
      }
      case TokenType.EOF:
        this.throwUnexpectedCharacterError(next);
        break;
      default: {
       break;
      }
    }

    return this.parseLogicalExpression();
  }

  private expect(token: Token, tokenType: TokenType, value?: string | string[]): void {
    const { type, content, span } = token;
    const { start } = span;
    const { line, character } = start;

    let meetValueCriteria = true;

    if (value) {
      if (typeof value === "string") {
        meetValueCriteria = value === content;
      } else {
        meetValueCriteria = value.includes(content);
      }
    }

    if (type !== tokenType || !meetValueCriteria) {
      throw new ParserError(`${this.filename}: ${line}:${character}: unexpected token '${content}`);
    }
  }

  parse(): File {
    const expressions: Expression[] = [];
    const datapackDecl: DatapackDecl = this.parseDatapackDeclaration();

    const currentToken: Token = this.lexer.lexRegular();
    while (currentToken.type !== TokenType.EOF) {
      this.lexer.unlex(currentToken);
      expressions.push(this.parseExpression());
    }

    return new File(datapackDecl, expressions);
  }
}


export class ParserError extends Error {}

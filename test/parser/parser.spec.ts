import Parser, { ParserError } from "../../src/parser/parser";
import Options from "../../src/options";
import {
  ASTNumber,
  ASTString,
  BinaryOperator,
  Binop,
  Call,
  Define,
  False,
  For,
  Id,
  If,
  Index,
  Let,
  Print,
  Slice,
  True,
  UnaryOperator,
  Unop,
  List,
  Begin,
  On,
  Load,
  Tick,
  Grant,
  Revoke,
  Execute,
  RawTrigger,
  ConsumeItem,
  ItemMatcher,
  TagMatcher,
  InventoryChanged, RawCommand, CombinedTrigger, Advancement, Title, Icon, Description, Parent, MCFunction,
} from "../../src/ast/ast";
import { assert } from "chai";

const sinon = require("sinon");
const fs = require("fs");

describe("parse", () => {
  let parser: Parser;
  const dummyOptions: Options = { outputFile: "test.out" };

  const setup = (program: string, datapack?: string) => {
    const response = datapack
      ? `${datapack} \n ${program}`
      : `datapack test \n ${program}`;
    sinon.stub(fs, "readFileSync").returns(response);
    parser = new Parser("", dummyOptions);
    sinon.restore();
  };

  const expectParserError = () => {
    assert.throws(() => parser.parse(), ParserError);
  }

  describe("parsePrint", () => {
    it("should throw error if expression not found after print", () => {
      setup("print");
      expectParserError();
    });

    it("should parse printing expression correctly", () => {
      setup('print if 5 + 3 == 8 then "t" else "f"');

      const file = parser.parse();

      const { expressions } = file;

      assert.equal(expressions.length, 1);
      assert.isTrue(expressions[0] instanceof Print);

      const print = expressions[0] as Print;

      const { expression: printExpression } = print;

      assert.isTrue(printExpression instanceof If);
    });

    it("should parse printing string correctly (happy path)", () => {
      setup('print "test"');

      const file = parser.parse();

      const { expressions } = file;

      assert.equal(expressions.length, 1);
      assert.equal(expressions[0] instanceof Print, true);

      const print: Print = expressions[0] as Print;
      const { expression } = print;

      assert.equal(expression instanceof ASTString, true);
    });
  });

  describe("parseDatapack", () => {
    it("should parse datapack declaration - happy path", () => {
      setup("");

      const file = parser.parse();

      const { datapackDecl } = file;
      const { id } = datapackDecl;
      const { id: datapackId } = id;

      assert.deepEqual(datapackId, "test");
    });

    it("should throw if datapack declaration is invalid - EOF", () => {
      setup("", "datapack   ");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });

    it("should throw if datapack declaration is invalid - number", () => {
      setup("", "datapack 5.012");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });

    it("should throw if detects multiple datapack declarations", () => {
      setup("datapack koel", "datapack datapack");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });

    it("should throw if datapack declaration is invalid - literal", () => {
      setup("", "datapack datapack");

      assert.throws(() => {
        parser.parse();
      }, ParserError);
    });
  });

  describe("parseLet", () => {
    it("should parse singular let correctly", () => {
      setup('let birb = "seagull" print birb');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Let);
      const letInstance = file.expressions[0] as Let;

      assert.deepEqual(letInstance.ids.length, 1);
      assert.deepEqual(letInstance.values.length, 1);

      const id = letInstance.ids[0] as Id; // TS likes to break things

      assert.deepEqual(id.id, "birb");

      assert.isTrue(letInstance.values[0] instanceof ASTString);
      const str = letInstance.values[0] as ASTString;

      assert.deepEqual(str.components, Array.from("seagull"));

      assert.isTrue(letInstance.body instanceof Print);
    });

    it("should parse let with multiple values correctly", () => {
      setup('let a = true, b = false, c = 5 print a');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Let);
      const letInstance = file.expressions[0] as Let;

      const { ids, values, body } = letInstance;
      assert.deepEqual(ids.length, 3);
      assert.deepEqual(values.length, 3);

      const idStrs = ["a", "b", "c"];

      for (let i = 0; i < letInstance.ids.length; i++) {
        const id = letInstance.ids[i] as Id;
        assert.deepEqual(id.id, idStrs[i]);
      }

      assert.isTrue(values[0] instanceof True);
      assert.isTrue(values[1] instanceof False);
      assert.isTrue(values[2] instanceof ASTNumber);

      assert.isTrue(body instanceof Print);
    });

    it("should throw parse error with ending comma", () => {
      setup('let a = true, b = false, c = 5, print a');
      expectParserError();
    });

    it('should throw parse error with no RHS in =', () => {
      setup('let a=');
      expectParserError();
    });

    it('should throw error with empty let', () => {
      setup('let');
      expectParserError();
    });

    it('should throw error with no id', () => {
      setup('let = myna');
      expectParserError();
    })

    it('should throw error with no body', () => {
      setup('let a = myna');
      expectParserError();
    })
  });

  describe('parsePrimaryExpression', () => {
    it('should throw error on stray punctuation', () => {
      setup('||');
      expectParserError();
    })
  });

  describe("parseAdditiveExpression", () => {
    it("should parse binary add expression", () => {
      setup('1 + 15');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 1);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.ADD);
    });

    it("should parse binary sub expression", () => {
      setup('3.5 - -2');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 3.5);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, -2);

      assert.deepEqual(op, BinaryOperator.SUB);
    });

    it("should parse 3-length expression", () => {
      setup('5 + 4 - 3');

      const file = parser.parse();


      assert.isTrue(file.expressions[0] instanceof Binop);

      const binOp0 = file.expressions[0] as Binop;
      const { lhs: lhs0 ,rhs: rhs0, op: op0 } = binOp0;

      assert.isTrue(lhs0 instanceof Binop);
      assert.equal(op0, BinaryOperator.SUB);

      assert.isTrue(rhs0 instanceof ASTNumber);
      assert.equal((rhs0 as ASTNumber).value, 3);

      const { lhs: lhs1, rhs: rhs1, op: op1 } = (lhs0 as Binop);

      assert.isTrue(lhs1 instanceof ASTNumber);
      assert.equal((lhs1 as ASTNumber).value, 5);

      assert.equal(op1, BinaryOperator.ADD);

      assert.isTrue(rhs1 instanceof ASTNumber);
      assert.equal((rhs1 as ASTNumber).value, 4);
    })

    it("should throw parser error for incomplete logical expression", () => {
      setup('print 2 + ');
      expectParserError();
    })

    it("should throw parser error for incomplete chained logical expression", () => {
      setup('print 2 - -');
      expectParserError();
    })
  });

  describe("parseEqualityExpression", () => {
    it("should parse binary equal expression", () => {
      setup('1 == 15');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);
      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 1);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.EQ);
    });

    it("should parse binary not equal expression", () => {
      setup('69 != 420');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);
      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 69);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 420);

      assert.deepEqual(op, BinaryOperator.NEQ);
    });

    it("should parse 3-length expression", () => {
      setup('5 != 10 == 3');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binOp0 = file.expressions[0] as Binop;
      const { lhs: lhs0 ,rhs: rhs0, op: op0 } = binOp0;

      assert.isTrue(lhs0 instanceof Binop);
      assert.equal(op0, BinaryOperator.EQ);

      assert.isTrue(rhs0 instanceof ASTNumber);
      assert.equal((rhs0 as ASTNumber).value, 3);

      const { lhs: lhs1, rhs: rhs1, op: op1 } = (lhs0 as Binop);

      assert.isTrue(lhs1 instanceof ASTNumber);
      assert.equal((lhs1 as ASTNumber).value, 5);

      assert.equal(op1, BinaryOperator.NEQ);

      assert.isTrue(rhs1 instanceof ASTNumber);
      assert.equal((rhs1 as ASTNumber).value, 10);
    })

    it("should throw parser error for incomplete logical expression", () => {
      setup('print 2 == ');
      expectParserError();
    })

    it("should throw parser error for incomplete chained logical expression", () => {
      setup('print 2 != ==');
      expectParserError();
    })
  })

  describe("parseRelationalExpression", () => {
    it("should parse binary less-than expression", () => {
      setup('1 < 15');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 1);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.LT);
    });

    it("should parse binary LTE expression", () => {
      setup('69 <= 420');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);
      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 69);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 420);

      assert.deepEqual(op, BinaryOperator.LTE);
    });

    it("should parse binary GT expression", () => {
      setup('5 > 120');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 5);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 120);

      assert.deepEqual(op, BinaryOperator.GT);
    });

    it("should parse binary GTE expression", () => {
      setup('46 >= 1288');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 46);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 1288);

      assert.deepEqual(op, BinaryOperator.GTE);
    });

    it("should parse 3-length expression", () => {
      setup('5 <= 10 > 3');

      const file = parser.parse();


      assert.isTrue(file.expressions[0] instanceof Binop);

      const binOp0 = file.expressions[0] as Binop;
      const { lhs: lhs0 ,rhs: rhs0, op: op0 } = binOp0;

      assert.isTrue(lhs0 instanceof Binop);
      assert.equal(op0, BinaryOperator.GT);

      assert.isTrue(rhs0 instanceof ASTNumber);
      assert.equal((rhs0 as ASTNumber).value, 3);

      const { lhs: lhs1, rhs: rhs1, op: op1 } = (lhs0 as Binop);

      assert.isTrue(lhs1 instanceof ASTNumber);
      assert.equal((lhs1 as ASTNumber).value, 5);

      assert.equal(op1, BinaryOperator.LTE);

      assert.isTrue(rhs1 instanceof ASTNumber);
      assert.equal((rhs1 as ASTNumber).value, 10);
    })

    it("should throw parser error for incomplete logical expression", () => {
      setup('print 2 < ');
      expectParserError();
    })

    it("should throw parser error for incomplete chained logical expression", () => {
      setup('print 2 >= <=');
      expectParserError();
    })
  });

  describe("parseSlice", () => {
    it("should parse slice with from and to", () => {
      setup('arr[1:5]');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Slice);
      const slice = file.expressions[0] as Slice;

      const { from, to, target } = slice;

      assert.isTrue(from instanceof ASTNumber);
      assert.isTrue(to instanceof ASTNumber);

      assert.equal((from as ASTNumber).value, 1);
      assert.equal((to as ASTNumber).value, 5);

      assert.isTrue(target instanceof Id);
      assert.deepEqual((target as Id).id, "arr");
    });

    it("should parse slice with from only", () => {
      setup('arr[1:]');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Slice);
      const slice = file.expressions[0] as Slice;

      const { from, to, target } = slice;

      assert.isTrue(from instanceof ASTNumber);
      assert.isNull(to);

      assert.equal((from as ASTNumber).value, 1);

      assert.isTrue(target instanceof Id);
      assert.deepEqual((target as Id).id, "arr");
    });

    it("should parse slice with to only", () => {
      setup('arr[:7]');

      const file = parser.parse();
      assert.isTrue(file.expressions[0] instanceof Slice);
      const slice = file.expressions[0] as Slice;

      const { from, to, target } = slice;

      assert.isNull(from);
      assert.isTrue(to instanceof ASTNumber);

      assert.equal((to as ASTNumber).value, 7);

      assert.isTrue(target instanceof Id);
      assert.deepEqual((target as Id).id, "arr");
    });

    it("should parse multiple slices", () => {
      setup('arr[1:7][0:5]');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Slice);
      const slice0 = file.expressions[0] as Slice;

      const { from: from0, to: to0, target: target0 } = slice0;

      assert.equal((from0 as ASTNumber).value, 0);
      assert.equal((to0 as ASTNumber).value, 5);

      assert.isTrue(from0 instanceof ASTNumber);
      assert.isTrue(to0 instanceof ASTNumber);
      assert.isTrue(target0 instanceof Slice);

      const { from: from1, to: to1, target: target1 } = (target0 as Slice);

      assert.isTrue(from1 instanceof ASTNumber);
      assert.isTrue(to1 instanceof ASTNumber);
      assert.isTrue(target1 instanceof Id);

      assert.equal((from1 as ASTNumber).value, 1);
      assert.equal((to1 as ASTNumber).value, 7);
      assert.deepEqual((target1 as Id).id, "arr");
    });

    it("should throw error on empty slice", () => {
      setup('arr[:]');

      expectParserError();
    });

    it("should throw error on incomplete slice", () => {
      setup('arr[:');

      expectParserError();
    });

    it("should throw error on empty square brackets", () => {
      setup('arr[]');

      expectParserError();
    });
  });

  describe("parseIndex", () => {
    it("should parse index", () => {
      setup('arr[1]');

      const file = parser.parse();
      assert.isTrue(file.expressions[0] instanceof Index);
      const index = file.expressions[0] as Index;


      const { index: indexValue, target } = index;

      assert.isTrue(indexValue instanceof ASTNumber);
      assert.equal((indexValue as ASTNumber).value, 1);

      assert.isTrue(target instanceof Id);
      assert.deepEqual((target as Id).id, "arr");
    });

    it("should parse multiple indices", () => {
      setup('arr[0][5]');

      const file = parser.parse();
      assert.isTrue(file.expressions[0] instanceof Index);
      const index0 = file.expressions[0] as Index;

      const { index: indexValue0, target: target0 } = index0;

      assert.isTrue(indexValue0 instanceof ASTNumber);
      assert.equal((indexValue0 as ASTNumber).value, 5);

      assert.isTrue(target0 instanceof Index);

      const { index: indexValue1, target: target1 } = (target0 as Index);

      assert.isTrue(indexValue1 instanceof ASTNumber);
      assert.equal((indexValue1 as ASTNumber).value, 0);

      assert.isTrue(target1 instanceof Id);
      assert.deepEqual((target1 as Id).id, "arr");
    })
  });

  describe("parseCall", () => {
    it("should parse empty call", () => {
      setup('arr()');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
      const call = file.expressions[0] as Call;


      const { args, target } = call;

      assert.equal(args.length, 0);
      assert.isTrue(target instanceof Id);

      assert.deepEqual((target as Id).id, "arr");
    });

    it("should parse call with args", () => {
      setup('fn(1, 2, 3)');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
      const call = file.expressions[0] as Call;

      const { args, target } = call;

      assert.equal(args.length, 3);

      const argVals = [1,2,3];

      for (let i = 0; i < args.length; i++) {
        assert.isTrue(args[i] instanceof ASTNumber);
        assert.equal((args[i] as ASTNumber).value, argVals[i]);
      }

      assert.isTrue(target instanceof Id);
      assert.deepEqual((target as Id).id, "fn");
    });

    it("should parse calls to calls", () => {
      setup('fn(1)()');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
      const call0 = file.expressions[0] as Call;

      const { args: args0, target: target0 } = call0;

      assert.isTrue(target0 instanceof Call);
      assert.equal(args0.length, 0);

      const { args: args1, target: target1 } = (target0 as Call);

      assert.isTrue(target1 instanceof Id);
      assert.deepEqual((target1 as Id).id, "fn");

      assert.equal(args1.length, 1);
    })

    it("should parse calls from slices", () => {
      setup('fn[2:5]()');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
      const call0 = file.expressions[0] as Call;

      const { args: args0, target: target0 } = call0;

      assert.isTrue(target0 instanceof Slice);
      assert.equal(args0.length, 0);
    });

    it("should parse calls from indices", () => {
      setup('fn[2]()');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
      const call0 = file.expressions[0] as Call;

      const { args: args0, target: target0 } = call0;

      assert.isTrue(target0 instanceof Index);
      assert.equal(args0.length, 0);
    });

    it("should throw error if call is not closed", () => {
      setup("fn(")
      expectParserError();
    });

    it("should throw error if call has an unexpected character", () => {
      setup("fn(a}")
      expectParserError();
    });
  });

  describe("parseBracketExpression", () => {
    it("should parse expression correctly", () => {
      setup("( fn() )");
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Call);
    });

    it("should throw error if bracket is not closed", () => {
      setup("(")
      expectParserError();
    })

    it("should throw error if bracket is empty", () => {
      setup("()");
      expectParserError();
    })
  })

  describe("parseBegin", () => {
    it("should parse begin with single expression", () => {
      setup("{ call() }");
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Begin);
      const begin = (file.expressions[0]) as Begin;

      assert.equal(begin.elements.length, 1);

      assert.isTrue(begin.elements[0] instanceof Call);
    });

    it("should parse begin with multiple expressions", () => {
      setup("{ a b c }");
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Begin);
      const begin = (file.expressions[0]) as Begin;

      assert.equal(begin.elements.length, 3);

      const ids = ['a','b','c'];

      for (let i = 0; i < begin.elements.length; i++) {
        assert.isTrue(begin.elements[i] instanceof Id);
        assert.deepEqual((begin.elements[i] as Id).id, ids[i]);
      }
    });

    it("should throw error if begin is incomplete", () => {
      setup("{");
      expectParserError();
    })
  })

  describe("parseList", () => {
    it("should parse empty list", () => {
      setup("[]");
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof List);
      const list = file.expressions[0] as List;

      assert.equal(list.elements.length, 0);
    });

    it("should parse non-empty list", () => {
      setup('["a", "b", "c"]');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof List);
      const list = file.expressions[0] as List;

      assert.equal(list.elements.length, 3);

      for (let i = 0; i < list.elements.length; i++) {
        assert.isTrue(list.elements[i] instanceof ASTString);
      }
    });

    it("should throw error with terminating comma", () => {
      setup('["a", "b", "c",]');
      expectParserError();
    });

    it("should throw error with multiple commas", () => {
      setup('["a",,,]');
      expectParserError();
    });

    it("should throw error with unclosed bracket", () => {
      setup("[");
      expectParserError();
    });

    it("should throw error with unexpected character", () => {
      setup("[a{");
      expectParserError();
    });
  });

  describe("parseAdvancement", () => {
    it("should parse empty advancement", () => {
      setup("advancement {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Advancement);
      const advancement = (file.expressions[0]) as Advancement;

      assert.equal(advancement.details.length, 0);
      assert.isNull(advancement.name);
    });

    it("should parse empty advancement with name", () => {
      setup("advancement (birb) {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Advancement);
      const advancement = (file.expressions[0]) as Advancement;

      assert.equal(advancement.details.length, 0);

      assert.isTrue(advancement.name instanceof Id);
      assert.deepEqual((advancement.name as Id).id, "birb");
    })

    it("should parse advancement with advancement specs", () => {
      setup('advancement (birb) { title = title0 icon = icon0 description = desc parent = par }');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Advancement);
      const advancement = (file.expressions[0]) as Advancement;

      const { details } = advancement;

      assert.equal(details.length, 4);

      assert.isTrue(details[0] instanceof Title);
      const title = details[0] as Title;
      assert.isTrue(title.title instanceof Id);
      assert.deepEqual((title.title as Id).id, "title0");

      assert.isTrue(details[1] instanceof Icon);
      const icon = details[1] as Icon;
      assert.isTrue(icon.icon instanceof Id);
      assert.deepEqual((icon.icon as Id).id, "icon0");

      assert.isTrue(details[2] instanceof Description);
      const desc = details[2] as Description;
      assert.isTrue(desc.description instanceof Id);
      assert.deepEqual((desc.description as Id).id, "desc");

      assert.isTrue(details[3] instanceof Parent);
      const parent = details[3] as Parent;
      assert.isTrue(parent.parent instanceof Id);
      assert.deepEqual((parent.parent as Id).id, "par");
    });

    it("should throw error with empty advancement name if there are brackets", () => {
      setup('advancement () {}');
      expectParserError();
    })

    it("should throw error with just advancement keyword", () => {
      setup("advancement");
      expectParserError();
    })

    it("should throw error if advancement name bracket isn't closed", () => {
      setup("advancement(");
      expectParserError();
    })

    it("should throw error if advancement curly brace not closed", () => {
      setup("advancement{");
      expectParserError();
    });

  })

  describe("parseFunction", () => {
    it("should parse empty function", () => {
      setup("function {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof MCFunction);
      const fn = (file.expressions[0]) as MCFunction;

      assert.isNull(fn.name);
      assert.equal(fn.commands.length, 0);
    });

    it("should parse empty function with name", () => {
      setup("function (birb) {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof MCFunction);
      const fn = (file.expressions[0]) as MCFunction;

      assert.equal(fn.commands.length, 0);

      assert.isTrue(fn.name instanceof Id);
      assert.deepEqual((fn.name as Id).id, "birb");
    })

    it("should parse function with commands", () => {
      setup("function { grant birb revoke weekendPass execute order66}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof MCFunction);
      const fn = (file.expressions[0]) as MCFunction;

      assert.equal(fn.commands.length, 3);

      assert.isTrue(fn.commands[0] instanceof Grant);
      const grant = fn.commands[0] as Grant;
      assert.isTrue(grant.name instanceof Id);
      assert.equal((grant.name as Id).id, "birb");

      assert.isTrue(fn.commands[1] instanceof Revoke);
      const revoke = fn.commands[1] as Grant;
      assert.isTrue(revoke.name instanceof Id);
      assert.equal((revoke.name as Id).id, "weekendPass");

      assert.isTrue(fn.commands[2] instanceof Execute);
      const execute = fn.commands[2] as Execute;
      assert.isTrue(execute.name instanceof Id);
      assert.equal((execute.name as Id).id, "order66");
    });

    it("should throw error with empty function name if there are brackets", () => {
      setup('function () {}');
      expectParserError();
    })

    it("should throw error with just function keyword", () => {
      setup("function");
      expectParserError();
    })

    it("should throw error if function name bracket isn't closed", () => {
      setup("function(");
      expectParserError();
    })

    it("should throw error if function curly brace not closed", () => {
      setup("function{");
      expectParserError();
    })
  })

  describe("parseOn", () => {
    it("should parse a load trigger", () => {
      setup("on (load) {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof Load);
    });

    it("should parse a tick trigger", () => {
      setup("on (tick) {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof Tick);
    });

    it("should parse a trigger with base commands", () => {
      setup("on (tick) { grant birb revoke weekendPass execute order66  }");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof Tick);
      assert.equal(on.commands.length, 3);

      assert.isTrue(on.commands[0] instanceof Grant);

      const grant = on.commands[0] as Grant;
      assert.isTrue(grant.name instanceof Id);
      assert.equal((grant.name as Id).id, "birb");

      assert.isTrue(on.commands[1] instanceof Revoke);
      const revoke = on.commands[1] as Grant;
      assert.isTrue(revoke.name instanceof Id);
      assert.equal((revoke.name as Id).id, "weekendPass");

      assert.isTrue(on.commands[2] instanceof Execute);
      const execute = on.commands[2] as Execute;
      assert.isTrue(execute.name instanceof Id);
      assert.equal((execute.name as Id).id, "order66");
    });

    it("should parse a trigger with expression commands", () => {
      setup('on (tick) { "effect give @s slow_falling 10"  }');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof Tick);
      assert.equal(on.commands.length, 1);

      assert.isTrue(on.commands[0] instanceof RawCommand);
      const rawCommand = (on.commands[0] as RawCommand);

      assert.isTrue(rawCommand.command instanceof ASTString)
      assert.deepEqual((rawCommand.command as ASTString).components, Array.from("effect give @s slow_falling 10"))
    });

    it("should parse combined trigger - expression", () => {
      setup("on (fail) {}");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof RawTrigger);
      const rawTrigger = (on.trigger as RawTrigger);

      assert.isTrue(rawTrigger.name instanceof Id);
      assert.deepEqual((rawTrigger.name as Id).id, "fail");
    })

    it("should parse combined trigger - consume item with item matcher", () => {
      setup('on (consume_item { item == "birb" }) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof ConsumeItem);
      const consumeItem = (on.trigger as ConsumeItem);


      assert.isTrue(consumeItem.details instanceof ItemMatcher);
      const itemMatcher = consumeItem.details as ItemMatcher;

      assert.isTrue(itemMatcher.name instanceof ASTString);
      assert.deepEqual((itemMatcher.name as ASTString).components, Array.from("birb"));
    });

    it("should parse combined trigger - consume item with tag matcher", () => {
      setup('on (consume_item { tag == "birb" }) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof ConsumeItem);
      const consumeItem = (on.trigger as ConsumeItem);


      assert.isTrue(consumeItem.details instanceof TagMatcher);
      const itemMatcher = consumeItem.details as TagMatcher;

      assert.isTrue(itemMatcher.name instanceof ASTString);
      assert.deepEqual((itemMatcher.name as ASTString).components, Array.from("birb"));
    });

    it("should parse combined trigger - inventory changed with item matcher", () => {
      setup('on (inventory_changed { item == "birb" }) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof InventoryChanged);
      const consumeItem = (on.trigger as InventoryChanged);


      assert.isTrue(consumeItem.details instanceof ItemMatcher);
      const itemMatcher = consumeItem.details as ItemMatcher;

      assert.isTrue(itemMatcher.name instanceof ASTString);
      assert.deepEqual((itemMatcher.name as ASTString).components, Array.from("birb"));
    });

    it("should parse combined trigger - inventory changed with tag matcher", () => {
      setup('on (inventory_changed { tag == "birb" }) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof InventoryChanged);
      const consumeItem = (on.trigger as InventoryChanged);

      assert.isTrue(consumeItem.details instanceof TagMatcher);
      const itemMatcher = consumeItem.details as TagMatcher;

      assert.isTrue(itemMatcher.name instanceof ASTString);
      assert.deepEqual((itemMatcher.name as ASTString).components, Array.from("birb"));
    });

    it("should parse combined trigger - inventory changed with tag matcher", () => {
      setup('on (inventory_changed { tag == "birb" } || consume_item { tag == id }) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof CombinedTrigger);
      const combinedTrigger = (on.trigger as CombinedTrigger);

      const { lhs, rhs } = combinedTrigger;

      assert.isTrue(lhs instanceof InventoryChanged);
      assert.isTrue(rhs instanceof ConsumeItem);
    });

    it("should parse combined trigger - 3 deep", () => {
      setup('on (inventory_changed { tag == "birb" } || consume_item { tag == id } || fn() ) {}');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof On);
      const on = (file.expressions[0]) as On;

      assert.isTrue(on.trigger instanceof CombinedTrigger);
      const combinedTrigger = (on.trigger as CombinedTrigger);

      const { lhs: lhs0, rhs: rhs0 } = combinedTrigger;

      assert.isTrue(lhs0 instanceof CombinedTrigger);
      assert.isTrue(rhs0 instanceof RawTrigger);
      assert.isTrue((rhs0 as RawTrigger).name instanceof Call);

      const { lhs: lhs1, rhs: rhs1 } = (lhs0 as CombinedTrigger);

      assert.isTrue(lhs1 instanceof InventoryChanged);
      assert.isTrue(rhs1 instanceof ConsumeItem);
    });

    it("should throw error if on has no trigger", () => {
      setup("on(){}");
      expectParserError();
    })

    it("should throw error if on bracket is unclosed", () => {
      setup("on(");
      expectParserError();
    });
  })

  describe("parseFor", () => {
    it("should parse complete for expression", () => {
      setup('for i in arr print i');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof For);
      const forInstance = (file.expressions[0]) as For;

      const { id, iterable, body } = forInstance;

      assert.deepEqual(id.id, "i");

      assert.isTrue(iterable instanceof Id);
      assert.deepEqual((iterable as Id).id, "arr");

      assert.isTrue(body instanceof Print);
    });

    it("should error if body is missing", () => {
      setup('for i in arr');
      expectParserError();
    })

    it("should error if print is missing", () => {
      setup('for i in');
      expectParserError();
    });

    it("should error if in is missing", () => {
      setup('for i');
      expectParserError();
    });

    it("should error if only for keyword is present", () => {
      setup('for');
      expectParserError();
    });

    it("should error if for body is invalid", () => {
      setup('for }');
      expectParserError();
    });

    it("should error if iterable is invalid", () => {
      setup('for a in {');
      expectParserError();
    });

    it("should error if body is invalid", () => {
      setup('for a in b datapack');
      expectParserError();
    });
  })

  describe("parsePrefixExpression", () => {
    it("should parse NOT expression", () => {
      setup("!55");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Unop);

      const unop = file.expressions[0] as Unop

      assert.equal(unop.op, UnaryOperator.NOT);
      assert.isTrue(unop.target instanceof ASTNumber);

      assert.equal((unop.target as ASTNumber).value, 55);
    });

    it("should parse Negation Expression", () => {
      setup("-hello");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Unop);

      const unop = file.expressions[0] as Unop

      assert.equal(unop.op, UnaryOperator.NEG);
      assert.isTrue(unop.target instanceof Id);

      assert.equal((unop.target as Id).id, "hello");
    });

    it("should throw parse error on multiple neg operators", () => {
      setup("print --");
      expectParserError();
    })

    it("should throw parse error on multiple not operators", () => {
      setup("print !!");
      expectParserError();
    })
  });

  describe("parseMultiplicativeExpression", () => {
    it("should parse binary multiply expression", () => {
      setup('1 * 15');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 1);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.MUL);
    });

    it("should parse binary mod expression", () => {
      setup('1 % 15');
      const file = parser.parse();
      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 1);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.MOD);
    });

    it("should parse binary divide expression", () => {
      setup('3.5/-2');
      const file = parser.parse();


      assert.isTrue(file.expressions[0] instanceof Binop);
      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof ASTNumber);
      assert.equal((lhs as ASTNumber).value, 3.5);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, -2);

      assert.deepEqual(op, BinaryOperator.DIV);
    });

    it("should parse 3-length expression", () => {
      setup(' 5 / 4 * 3');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binOp0 = file.expressions[0] as Binop;
      const { lhs: lhs0 ,rhs: rhs0, op: op0 } = binOp0;

      assert.isTrue(lhs0 instanceof Binop);
      assert.equal(op0, BinaryOperator.MUL);

      assert.isTrue(rhs0 instanceof ASTNumber);
      assert.equal((rhs0 as ASTNumber).value, 3);



      const { lhs: lhs1, rhs: rhs1, op: op1 } = (lhs0 as Binop);


      assert.isTrue(lhs1 instanceof ASTNumber);
      assert.equal(op1, BinaryOperator.DIV);
      assert.isTrue(rhs1 instanceof ASTNumber);
    })

    it("should throw parser error for incomplete logical expression", () => {
      setup('print 2 * ');
      expectParserError();
    })

    it("should throw parser error for incomplete chained logical expression", () => {
      setup('print 2 / *');
      expectParserError();
    })
  })

  describe("parseLogicalExpression", () => {
    it("should parse binary and expression", () => {
      setup('true && 15');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof True);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 15);

      assert.deepEqual(op, BinaryOperator.AND);
    });

    it("should parse binary or expression", () => {
      setup('false || 69');
      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Binop);

      const binop = file.expressions[0] as Binop;

      const { lhs, rhs, op } = binop;

      assert.isTrue(lhs instanceof False);

      assert.isTrue(rhs instanceof ASTNumber);
      assert.equal((rhs as ASTNumber).value, 69);

      assert.deepEqual(op, BinaryOperator.OR);
    });

    it("should parse 3-length expression", () => {
      setup('false || true && 0');

      const file = parser.parse();
      assert.isTrue(file.expressions[0] instanceof Binop);

      const binOp0 = file.expressions[0] as Binop;
      const { lhs: lhs0 ,rhs: rhs0, op: op0 } = binOp0;

      assert.isTrue(lhs0 instanceof Binop);
      assert.equal(op0, BinaryOperator.AND);

      assert.isTrue(rhs0 instanceof ASTNumber);
      assert.equal((rhs0 as ASTNumber).value, 0);



      const { lhs: lhs1, rhs: rhs1, op: op1 } = (lhs0 as Binop);


      assert.isTrue(lhs1 instanceof False);
      assert.equal(op1, BinaryOperator.OR);
      assert.isTrue(rhs1 instanceof True);
    })

    it("should throw parser error for incomplete logical expression", () => {
      setup('print false ||');
      expectParserError();
    })

    it("should throw parser error for incomplete chained logical expression", () => {
      setup('print false && ||');
      expectParserError();
    })
  })

  describe("parseDefine", () => {
    it("should parse define with no ID but with body", () => {
      setup("define () print test");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Define);

      const define = file.expressions[0] as Define;

      assert.isTrue(define.body instanceof Print);
    });

    it("should parse define with ID", () => {
      setup("define koel() print test");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Define);

      const define = file.expressions[0] as Define;

      assert.isTrue(define.body instanceof Print);
      assert.isTrue(define.id instanceof Id);
      assert.isTrue((define.id as Id).id === "koel");
    });

    it("should parse define with 1 arg", () => {
      setup("define koel(a) print test");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Define);

      const define = file.expressions[0] as Define;

      assert.isTrue(define.body instanceof Print);
      assert.isTrue(define.id instanceof Id);
      assert.isTrue((define.id as Id).id === "koel");

      assert.deepEqual(define.args.length, 1);

      const arg0 = define.args[0] as Id;

      assert.deepEqual(arg0.id, "a");
    })

    it("should parse define with multiple args", () => {
      setup("define koel(a,b,c,d) print test");

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof Define);

      const define = file.expressions[0] as Define;

      assert.isTrue(define.body instanceof Print);
      assert.isTrue(define.id instanceof Id);
      assert.isTrue((define.id as Id).id === "koel");

      const { args } = define;

      assert.deepEqual(args.length, 4);

      const ids = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < args.length; i++) {
        const id = args[i] as Id;
        assert.deepEqual(id.id, ids[i]);
      }
    })

    it("should throw error for define without open paran", () => {
      setup("define koel print test");
      expectParserError();
    })

    it("should throw error for define with unexpected character", () => {
      setup("define koel(a }) print test");
      expectParserError();
    })

    it("should throw error for define with trailing comma in args list", () => {
      setup("define koel(a,) print test");
      expectParserError();
    })

    it("should throw error for define without body", () => {
      setup("define koel(a,b,c)");
      expectParserError();
    })
  });

  describe("parseTrue", () => {
    it("should parse true token as true", () => {
      setup('print true');
      const file = parser.parse();

      assert.isTrue((file.expressions[0] as Print).expression instanceof True);
    })
  })

  describe("parseFalse", () => {
    it("should parse false token as false", () => {
      setup('print false');
      const file = parser.parse();

      assert.isTrue((file.expressions[0] as Print).expression instanceof False);
    });
  })

  describe("parseIf", () => {
    it("should parse full if function correctly", () => {
      setup('if 5 + 3 == 8 then "t" else "f"');

      const file = parser.parse();

      assert.isTrue(file.expressions[0] instanceof If);

      const ifExpr = file.expressions[0] as If;

      assert.isTrue(ifExpr.predicate instanceof Binop);
      assert.isTrue(ifExpr.consequent instanceof ASTString);
      assert.isTrue(ifExpr.alternative instanceof ASTString);

      const predicate = ifExpr.predicate as Binop;

      assert.isTrue(predicate.rhs instanceof ASTNumber);
      assert.deepEqual(predicate.op, BinaryOperator.EQ);

      const rhs = predicate.rhs as ASTNumber;

      assert.equal(rhs.value, 8);

      assert.isTrue(predicate.lhs instanceof Binop);

      const additiveOp = predicate.lhs as Binop;

      assert.deepEqual(additiveOp.op, BinaryOperator.ADD);

      assert.isTrue(additiveOp.lhs instanceof ASTNumber);
      assert.deepEqual((additiveOp.lhs as ASTNumber).value, 5);

      assert.isTrue(additiveOp.rhs instanceof ASTNumber);
      assert.deepEqual((additiveOp.rhs as ASTNumber).value, 3);
    });

    it("should throw error for if without expression after else", () => {
      setup('print if 5 + 3 == 8 then "t" else');
      expectParserError();
    });

    it("should throw error for if without else", () => {
      setup('print if 5 + 3 == 8 then "t"');
      expectParserError();
    });

    it("should throw error for if without consequence", () => {
      setup('print if 5 + 3 == 8 then');
      expectParserError();
    })

    it("should throw error for if without then", () => {
      setup('print if 5 + 3 == 8');
      expectParserError();
    })

    it("should throw error for if without predicate", () => {
      setup('print if 5 + 3 == 8');
      expectParserError();
    });

    it("should throw error for invalid if expression", () => {
      setup('print if (');
      expectParserError();
    })
  });

  describe("parseString", () => {
    it("should parse expression string correctly", () => {
      setup('print "test{ 2 }"');

      const file = parser.parse();

      const print: Print = file.expressions[0] as Print;
      const { expression } = print;

      assert.isTrue(expression instanceof ASTString);

      const { components } = expression as ASTString;
      assert.equal(components.length, "test".length + 1);

      for (let i = 0; i < "test".length; i++)
        assert.equal(components[i], "test".charAt(i));

      assert.isTrue(components[components.length - 1] instanceof ASTNumber);

      const astNumber = components[components.length - 1] as ASTNumber;

      assert.equal(astNumber.value, 2);
    });

    it("should parse plain string correctly", () => {
      setup('print "test"');

      const file = parser.parse();

      const print: Print = file.expressions[0] as Print;
      const { expression } = print;

      assert.equal(expression instanceof ASTString, true);

      const { components } = expression as ASTString;

      assert.equal(components.length, "test".length);
      for (let i = 0; i < "test".length; i++)
        assert.equal(components[i], "test".charAt(i));
    });

    it("should encounter parse error if EOF reached", () => {
      setup('print "test{ 2"');

      expectParserError();
    });

    it("should throw parse error if string is unclosed", () => {
      setup('print "');

      expectParserError();
    });
  });

  describe("parseNumber", () => {
    it("should parse number", () => {
      setup("print 256");

      const file = parser.parse();

      const number = (file.expressions[0] as Print).expression;

      assert.isTrue(number instanceof ASTNumber);
      assert.deepEqual((number as ASTNumber).value, 256);
    });
  });

  describe("top-level cases", () => {
    it("should parse multiple expressions", () => {
      setup("print 256 \n for a in b print a \n fn()")

      const file = parser.parse();
      assert.equal(file.expressions.length, 3);

      assert.isTrue(file.expressions[0] instanceof Print);
      assert.isTrue(file.expressions[1] instanceof For);
      assert.isTrue(file.expressions[2] instanceof Call);
    })
  })
});

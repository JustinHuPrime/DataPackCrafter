import { assert } from "chai";
import { Advancement, ASTNumber, ASTString, Begin, BinaryOperator, Binop, Call, ConsumeItem, Define, Description, Expression, False, For, Icon, Id, If, Index, ItemMatcher, Let, List, Parent, Slice, Title, True, UnaryOperator, Unop, TagMatcher, InventoryChanged, CombinedTrigger, Load, Tick, Grant, Revoke, Execute, Command, RawCommand, On, MCFunction } from "../../src/ast/ast";
import Span, { Location } from "../../src/ast/span";
import Token, { TokenType } from "../../src/ast/token";
import { Evaluator, EvaluatorEnv } from "../../src/codeGenerator/evaluator";
import { DSLNameConflictError } from "../../src/codeGenerator/exceptions";
import STORE, * as Store from "../../src/codeGenerator/store";

function dummyToken(content?: string) : Token {
    /**
     * Create a dummy token with the given string content
     */
    if (content === undefined) {
        content = "";
    }
    return new Token(TokenType.LITERAL, new Span(new Location(0, 0), new Location(0, content.length)), content);
}

function idNode(name: string) : Id {
    /**
     * Create an Id node referring to the given variable.
     */
    return new Id(dummyToken(name));
}
function numNode(value: string) : ASTNumber {
    /**
     * Create an number node with the given value.
     */
    return new ASTNumber(dummyToken(value));
}
function stringNode(content: string) : ASTString {
    /**
     * Create an pure string node with the given content.
     */
    return new ASTString(dummyToken(), [content], dummyToken());
}

/* Example functions for reuse in testing */
let addXYFunc : Define;
{
    // This defines an example function fancyFunc that adds x to y
    let x : Id = idNode("x");
    let y : Id = idNode("y");
    let body = new Binop(x, BinaryOperator.ADD, y);
    addXYFunc = new Define(dummyToken(), idNode("fancyFunc"), [x, y], body);
}
let factorialFunc : Define;
{
    let fnId = idNode("fact");
    let n    = idNode("n");

    let pred = new Binop(n, BinaryOperator.LTE, numNode("0")); // lazily handling negatives
    let baseCase = numNode("1");

    // Building up the recursive case
    let recurCall = new Call(fnId, [new Binop(n, BinaryOperator.SUB, numNode("1"))], dummyToken());
    let recurCase = new Binop(n, BinaryOperator.MUL, recurCall);

    let body = new If(dummyToken(), pred, baseCase, recurCase);
    factorialFunc = new Define(dummyToken(), fnId, [n], body);
}

describe("evaluator - core", () => {

    it('visitTrue', function() {
        let evaluator = new Evaluator();
        let expr = new True(dummyToken("true"));
        assert.equal(evaluator.evaluate(expr), true);
    });

    it('visitFalse', function() {
        let evaluator = new Evaluator();
        let expr = new False(dummyToken("false"));
        assert.equal(evaluator.evaluate(expr), false);
    });

    it('visitNumber', function() {
        let evaluator = new Evaluator();
        let expr = new ASTNumber(dummyToken("3.141592653"));
        assert.equal(evaluator.evaluate(expr), 3.141592653);
        expr = new ASTNumber(dummyToken("50"));
        assert.equal(evaluator.evaluate(expr), 50);
    });

    it('visitBinop arithmetic', function() {
        let evaluator = new Evaluator();
        let lhs = new ASTNumber(dummyToken("111"));
        let rhs = new ASTNumber(dummyToken("222"));
        let expr: Expression;

        expr = new Binop(lhs, BinaryOperator.ADD, rhs);
        assert.equal(evaluator.evaluate(expr), 333);
        expr = new Binop(lhs, BinaryOperator.SUB, rhs);
        assert.equal(evaluator.evaluate(expr), -111);
        expr = new Binop(lhs, BinaryOperator.MUL, rhs);
        assert.equal(evaluator.evaluate(expr), 111*222);
        expr = new Binop(lhs, BinaryOperator.DIV, rhs);
        assert.equal(evaluator.evaluate(expr), 111/222);
    });

    it('visitBinop add string', function() {
        let evaluator = new Evaluator();
        let lhs = stringNode("abc");
        let rhs = stringNode("def");
        let expr: Expression;

        expr = new Binop(lhs, BinaryOperator.ADD, rhs);
        assert.equal(evaluator.evaluate(expr), "abcdef");
    });

    it('visitBinop add lists', function() {
        let evaluator = new Evaluator();
        let lhs = new List(dummyToken(), [numNode("22"),numNode("3371.000001"),], dummyToken());
        let rhs = new List(dummyToken(), [stringNode("hello"), stringNode("string")], dummyToken());
        let expr: Expression;
        expr = new Binop(lhs, BinaryOperator.ADD, rhs);
        assert.deepEqual(evaluator.evaluate(expr), [22, 3371.000001, "hello", "string"]);
    });

    it('visitBinop modulo', function() {
        let evaluator = new Evaluator();
        let lhs = new ASTNumber(dummyToken("15"));
        let rhs = new ASTNumber(dummyToken("4"));
        let expr = new Binop(lhs, BinaryOperator.MOD, rhs);
        assert.equal(evaluator.evaluate(expr), 3);
    });

    it('visitBinop comparisons on numbers', function() {
        let evaluator = new Evaluator();
        let five = new ASTNumber(dummyToken("5"));
        let three = new ASTNumber(dummyToken("3"));
        let expr: Expression;

        expr = new Binop(five, BinaryOperator.GT, three);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(five, BinaryOperator.GTE, three);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(five, BinaryOperator.LT, three);
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(five, BinaryOperator.LTE, three);
        assert.equal(evaluator.evaluate(expr), false);

        expr = new Binop(five, BinaryOperator.EQ, three);
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(five, BinaryOperator.NEQ, three);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(five, BinaryOperator.EQ, five);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(five, BinaryOperator.GTE, five);
        assert.equal(evaluator.evaluate(expr), true);
    });

    it('visitBinop comparisons on strings', function() {
        let evaluator = new Evaluator();
        let expr: Expression;

        expr = new Binop(stringNode("a"), BinaryOperator.GT, stringNode("b"));
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(stringNode("a"), BinaryOperator.GTE, stringNode("a"));
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(stringNode("[["), BinaryOperator.LT, stringNode("]]"));
        assert.equal(evaluator.evaluate(expr), true);
    });

    it('visitBinop equality simple types', function() {
        let evaluator = new Evaluator();
        let expr: Expression;

        expr = new Binop(stringNode("foo"), BinaryOperator.EQ, stringNode("foo"));
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(stringNode("foo"), BinaryOperator.NEQ, stringNode("foo"));
        assert.equal(evaluator.evaluate(expr), false);

        expr = new Binop(stringNode("foo"), BinaryOperator.EQ, stringNode("asdf"));
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(stringNode("foo"), BinaryOperator.NEQ, stringNode("asdf"));
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(numNode("1"), BinaryOperator.EQ, numNode("1"));
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(numNode("1"), BinaryOperator.NEQ, numNode("1"));
        assert.equal(evaluator.evaluate(expr), false);

        // mismatched types
        expr = new Binop(numNode("1"), BinaryOperator.EQ, stringNode("asdf"));
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(numNode("1"), BinaryOperator.NEQ, stringNode("asdf"));
        assert.equal(evaluator.evaluate(expr), true);
    });

    it('visitBinop equality lists', function() {
        let evaluator = new Evaluator();
        let lst1 = new List(dummyToken(), [], dummyToken());
        let lst2 = new List(dummyToken(), [stringNode("foo"), numNode("123")], dummyToken());
        let expr: Expression;

        expr = new Binop(lst1, BinaryOperator.EQ, lst1);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(lst1, BinaryOperator.NEQ, lst1);
        assert.equal(evaluator.evaluate(expr), false);

        expr = new Binop(lst2, BinaryOperator.EQ, lst2);
        assert.equal(evaluator.evaluate(expr), true);

        expr = new Binop(lst1, BinaryOperator.NEQ, lst2);
        assert.equal(evaluator.evaluate(expr), true);

        // mismatched types
        expr = new Binop(lst1, BinaryOperator.EQ, stringNode("asdf"));
        assert.equal(evaluator.evaluate(expr), false);
    });

    it('visitBinop AND', function() {
        let evaluator = new Evaluator();
        let nodeTrue = new True(dummyToken());
        let nodeFalse = new False(dummyToken());
        let expr: Expression;

        expr = new Binop(nodeTrue, BinaryOperator.AND, nodeTrue);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(nodeFalse, BinaryOperator.AND, nodeTrue);
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(nodeTrue, BinaryOperator.AND, nodeFalse);
        assert.equal(evaluator.evaluate(expr), false);
        expr = new Binop(nodeFalse, BinaryOperator.AND, nodeFalse);
        assert.equal(evaluator.evaluate(expr), false);
    });

    it('visitBinop OR', function() {
        let evaluator = new Evaluator();
        let nodeTrue = new True(dummyToken());
        let nodeFalse = new False(dummyToken());
        let expr: Expression;

        expr = new Binop(nodeTrue, BinaryOperator.OR, nodeTrue);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(nodeFalse, BinaryOperator.OR, nodeTrue);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(nodeTrue, BinaryOperator.OR, nodeFalse);
        assert.equal(evaluator.evaluate(expr), true);
        expr = new Binop(nodeFalse, BinaryOperator.OR, nodeFalse);
        assert.equal(evaluator.evaluate(expr), false);
    });

    let binopErrors : {[key: string]: [BinaryOperator, Expression, Expression]} = {
        "divide by 0": [BinaryOperator.DIV, numNode("1"), numNode("0")],
        "type mismatch for +": [BinaryOperator.ADD, numNode("94"), factorialFunc],
        "bad LHS for +": [BinaryOperator.ADD, factorialFunc, factorialFunc],
        "type mismatch for -": [BinaryOperator.SUB, numNode("27.32"), stringNode("")],
        "bad LHS for -": [BinaryOperator.SUB, stringNode(""), stringNode("")],
        "type mismatch for *": [BinaryOperator.MUL, numNode("2"), stringNode("3")],
        "bad LHS for *": [BinaryOperator.MUL, stringNode(""), stringNode("e")],
        "type mismatch for /": [BinaryOperator.DIV, numNode("20"), new False(dummyToken())],
        "bad LHS for /": [BinaryOperator.DIV, addXYFunc, factorialFunc],
        "type mismatch for %": [BinaryOperator.MOD, numNode("2"), new True(dummyToken())],
        "bad LHS for %": [BinaryOperator.MOD,
                          new List(dummyToken(), [numNode("0")], dummyToken()),
                          new List(dummyToken(), [numNode("0")], dummyToken())],
        "type mismatch for &&": [BinaryOperator.AND, new True(dummyToken()), addXYFunc],
        "bad LHS for &&": [BinaryOperator.AND, numNode("3"), numNode("5")],
        "type mismatch for ||": [BinaryOperator.OR, new False(dummyToken()), new List(dummyToken(), [], dummyToken())],
        "bad LHS for ||": [BinaryOperator.OR, stringNode(""), stringNode("|")],
        "type mismatch for >": [BinaryOperator.GT, stringNode("a"), new List(dummyToken(), [], dummyToken())],
        "bad LHS for >": [BinaryOperator.GT,addXYFunc, addXYFunc],
        "type mismatch for >=": [BinaryOperator.GTE, numNode("30"), factorialFunc],
        "bad LHS for >=": [BinaryOperator.GTE, addXYFunc, addXYFunc],
        "type mismatch for <": [BinaryOperator.LT, stringNode("c"), numNode("2131")],
        "bad LHS for <": [BinaryOperator.LT,
                          new List(dummyToken(), [], dummyToken()),
                          new List(dummyToken(), [numNode("0")], dummyToken())],
        "type mismatch for <=": [BinaryOperator.LTE, numNode("0"), stringNode("QWERTY")],
        "bad LHS for <=": [BinaryOperator.LTE,
                           new List(dummyToken(), [numNode("3")], dummyToken()),
                           new List(dummyToken(), [numNode("0")], dummyToken())],
    }

    for (let errorDesc of Object.keys(binopErrors)) {
        it(`visitBinop error: ${errorDesc}`, function() {
            let evaluator = new Evaluator();
            let binOp = binopErrors[errorDesc]![0];
            let lhs = binopErrors[errorDesc]![1];
            let rhs = binopErrors[errorDesc]![2];
            assert.throws(() => evaluator.evaluate(new Binop(lhs, binOp, rhs)));
        });
    }

    it('visitIf false', function() {
        let evaluator = new Evaluator();
        let pred = new False(dummyToken());
        let expr = new If(dummyToken("if"),
                          pred,
                          new ASTNumber(dummyToken("1")),
                          new ASTNumber(dummyToken("2")));
        assert.equal(evaluator.evaluate(expr), 2);
    });

    it('visitIf true', function() {
        let evaluator = new Evaluator();
        let pred = new True(dummyToken());
        let expr = new If(dummyToken("if"),
                          pred,
                          new ASTNumber(dummyToken("1")),
                          new ASTNumber(dummyToken("2")));
        assert.equal(evaluator.evaluate(expr), 1);
    });

    it('visitIf predicate is evaluated', function() {
        let evaluator = new Evaluator();
        let pred = new Binop(numNode("3"), BinaryOperator.GT, numNode("-3"));
        let expr = new If(dummyToken("if"),
                          pred,
                          new ASTNumber(dummyToken("1")),
                          new ASTNumber(dummyToken("2")));
        assert.equal(evaluator.evaluate(expr), 1);
    });

    it('visitIf only one branch is evaluated', function() {
        let evaluator = new Evaluator();
        let pred = new True(dummyToken());
        let expr = new If(dummyToken("if"),
                          pred,
                          new ASTNumber(dummyToken("1")),
                          new Binop(numNode("0"), BinaryOperator.DIV, numNode("0")));
        assert.equal(evaluator.evaluate(expr), 1);
    });

    it('visitIf error: wrong type of predicate', function() {
        let evaluator = new Evaluator();
        let expr = new If(dummyToken("if"),
                          numNode("123456789"),
                          numNode("123456789"),
                          numNode("123456789"));
        assert.throws(() => evaluator.evaluate(expr));
    });

    it('visitUnop', function() {
        let evaluator = new Evaluator();
        let myNum = new ASTNumber(dummyToken("10"));
        let myBool = new True(dummyToken());
        assert.equal(evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NEG, myNum)), -10);
        assert.equal(evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NOT, myBool)), false);
        assert.throws(() => evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NOT, myNum)
        ));
        assert.throws(() => evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NEG, stringNode("AAAAAAAAA"))
        ));
    });

    it('visitDefine', function() {
        let evaluator = new Evaluator();
        let fnClosure = evaluator.evaluate(addXYFunc);

        // This only checks the return type and env update, as there is no function call
        assert.equal(fnClosure.fn, addXYFunc);
        assert.equal(fnClosure.env.fetch("fancyFunc"), fnClosure);
    });

    it('visitDefine error: duplicate variable names', function() {
        let evaluator = new Evaluator();
        // fun fact: if you do this in JS it will just take the right-most "x" as x.
        let define = new Define(dummyToken(),
                                idNode("weird"), [idNode("x"), idNode("y"), idNode("x")],
                                idNode("x"))
        assert.throws(() => evaluator.evaluate(define));
    });

    it('visitLet / visitId simple', function() {
        let evaluator = new Evaluator();
        let letNode;
        let mathNode = new Binop(numNode("3"), BinaryOperator.MUL, numNode("5"));

        // Returning variable as is
        letNode = new Let(dummyToken(), [idNode("x")], [numNode("3")],
                          idNode("x"));
        assert.equal(evaluator.evaluate(letNode), 3);

        // Evaluating the variable result first
        letNode = new Let(dummyToken(), [idNode("x")], [mathNode],
                          idNode("x"));
        assert.equal(evaluator.evaluate(letNode), 15);

        // Bit of evaluation in both
        letNode = new Let(dummyToken(), [idNode("x")], [mathNode],
                          new Binop(idNode("x"), BinaryOperator.ADD, numNode("5")));
        assert.equal(evaluator.evaluate(letNode), 20);
    });

    it('visitLet / visitId multiple args', function() {
        let evaluator = new Evaluator();
        let letNode;
        // x * y
        let mathNode = new Binop(idNode("x"), BinaryOperator.MUL, idNode("y"));
        letNode = new Let(dummyToken(), [idNode("x"), idNode("y")],
                                        [numNode("41"), numNode("10")],
                                        mathNode);
        assert.equal(evaluator.evaluate(letNode), 410);
    });

    let letErrors : {[key: string]: Let} = {
        "unknown reference in body":
            new Let(dummyToken(), [idNode("x")], [numNode("1337")], idNode("y")),
        "unknown reference in named expression":
            new Let(dummyToken(), [idNode("x")], [idNode("y")], idNode("x")),
        "self reference in named expression":
            new Let(dummyToken(), [idNode("x")], [idNode("x")], idNode("x")),
        "more ids than named-exprs given":
            new Let(dummyToken(), [idNode("a"), idNode("b")], [numNode("-1")], numNode("0")),
        "more named-exprs than ids given":
            new Let(dummyToken(), [idNode("a"), idNode("b")], [numNode("-1"), numNode("-2"), numNode("-3")], numNode("0")),
    }
    for (let letErrorDesc of Object.keys(letErrors)) {
        it(`visitLet error: ${letErrorDesc}`, function() {
            let evaluator = new Evaluator();
            assert.throws(() => evaluator.evaluate(letErrors[letErrorDesc]!));
        });
    }

    it('visitBegin', function() {
        let evaluator = new Evaluator();
        let beginNode = new Begin(dummyToken("{"), [
            new Binop(numNode("2"), BinaryOperator.ADD, numNode("3")),
            new Binop(numNode("2"), BinaryOperator.MUL, numNode("3")),
        ], dummyToken("}"));
        assert.equal(evaluator.evaluate(beginNode), 6);
    });

    it('visitCall anonymous function', function() {
        let evaluator = new Evaluator();
        let func = new Define(dummyToken(), null, [], numNode("4")); // totally not getRandomNumber()
        let prog = new Call(func, [], dummyToken());
        assert.equal(evaluator.evaluate(prog), 4);
    });

    it('visitCall named function', function() {
        let evaluator = new Evaluator();
        let prog = new Begin(dummyToken(), [
            addXYFunc,
            new Call(idNode("fancyFunc"), [numNode("3"), numNode("7")], dummyToken()),
        ], dummyToken());
        assert.equal(evaluator.evaluate(prog), 10);
    });

    it('visitCall recursion (factorial)', function() {
        let evaluator = new Evaluator();
        let prog : Expression;

        prog = new Begin(dummyToken(), [
            factorialFunc,
            new Call(factorialFunc.id!, [numNode("1")], dummyToken()),
        ], dummyToken());
        assert.equal(evaluator.evaluate(prog), 1);

        prog = new Begin(dummyToken(), [
            factorialFunc,
            new Call(factorialFunc.id!, [numNode("5")], dummyToken()),
        ], dummyToken());
        assert.equal(evaluator.evaluate(prog), 120);
    });

    let callErrors : {[key: string]: Expression} = {
        "too many arguments": new Begin(dummyToken(), [
            addXYFunc,
            new Call(idNode("fancyFunc"), [numNode("3"), numNode("7"), numNode("-5")], dummyToken()),
        ], dummyToken()),

        "too few arguments": new Begin(dummyToken(), [
            addXYFunc,
            new Call(idNode("fancyFunc"), [numNode("3")], dummyToken()),
        ], dummyToken()),

        "unknown variable in function part":
            new Call(idNode("qwerty"), [numNode("3")], dummyToken()),
        "calling a non-function":
            new Call(new True(dummyToken()), [], dummyToken()),

        "unknown variable in function arg":
            new Call(addXYFunc, [idNode("x"), idNode("y")], dummyToken()),

        "unknown variable in function body":
            new Call(new Define(dummyToken(), null, [idNode("x"), idNode("y")], idNode("z")),
            [idNode("x"), idNode("y")], dummyToken()),
    }
    for (let errorDesc of Object.keys(callErrors)) {
        it(`visitCall error: ${errorDesc}`, function() {
            let evaluator = new Evaluator();
            assert.throws(() => evaluator.evaluate(callErrors[errorDesc]!));
        });
    }

    it('visitString empty', function() {
        let evaluator = new Evaluator();
        let expr = new ASTString(dummyToken(), [], dummyToken());
        assert.equal(evaluator.evaluate(expr), "");
    });

    it('visitString simple', function() {
        let evaluator = new Evaluator();
        let expr = new ASTString(dummyToken(), ["hello world"], dummyToken());
        assert.equal(evaluator.evaluate(expr), "hello world");
    });

    it('visitString concat multiple strings', function() {
        let evaluator = new Evaluator();
        let expr = new ASTString(dummyToken(), ["Straw", "berry"], dummyToken());
        assert.equal(evaluator.evaluate(expr), "Strawberry");
    });

    it('visitString nested string expr', function() {
        let evaluator = new Evaluator();
        let inner = new ASTString(dummyToken(), ["B"], dummyToken());
        let expr = new ASTString(dummyToken(), ["A", inner, "C"], dummyToken());
        assert.equal(evaluator.evaluate(expr), "ABC");
    });

    it('visitString nested non-string exprs', function() {
        let evaluator = new Evaluator();
        let bool = new False(dummyToken());
        let num = numNode("12345");
        let expr = new ASTString(dummyToken(), ["num is ", num, "; bool is ", bool], dummyToken());
        assert.equal(evaluator.evaluate(expr), "num is 12345; bool is false");
    });

    it('visitList', function() {
        let evaluator = new Evaluator();
        let expr;

        expr = new List(dummyToken(), [], dummyToken());
        assert.deepEqual(evaluator.evaluate(expr), []);

        expr = new List(dummyToken(), [stringNode("hello"), numNode("123"), stringNode("goodbye")], dummyToken());
        assert.deepEqual(evaluator.evaluate(expr), ["hello", 123, "goodbye"]);
    });

    it('visitIndex on list', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(), [stringNode("a"), stringNode("b"), stringNode("c")], dummyToken());

        let indexCall : Expression;
        indexCall = new Index(list, numNode("0"), dummyToken());
        assert.equal(evaluator.evaluate(indexCall), "a");
        indexCall = new Index(list, numNode("1"), dummyToken());
        assert.equal(evaluator.evaluate(indexCall), "b");
        indexCall = new Index(list, numNode("2"), dummyToken());
        assert.equal(evaluator.evaluate(indexCall), "c");
    });

    it('visitIndex on string', function() {
        let evaluator = new Evaluator();
        let list = stringNode("Abracadabra");
        let indexCall : Expression;
        indexCall = new Index(list, numNode("0"), dummyToken());
        assert.equal(evaluator.evaluate(indexCall), "A");
        indexCall = new Index(list, numNode("4"), dummyToken());
        assert.equal(evaluator.evaluate(indexCall), "c");
    });

    it('visitIndex error: bad target type', function() {
        let evaluator = new Evaluator();
        let target = numNode("5678");
        let indexCall = new Index(target, numNode("0"), dummyToken());
        assert.throw(() => evaluator.evaluate(indexCall));
    });

    it('visitIndex error: index out of range', function() {
        let evaluator = new Evaluator();
        let target = stringNode("Abracadabra");
        let indexCall = new Index(target, numNode("25"), dummyToken());
        assert.throw(() => evaluator.evaluate(indexCall));
    });

    it('visitIndex error: index is wrong type', function() {
        let evaluator = new Evaluator();
        let target = stringNode("Abracadabra");
        let indexCall = new Index(target, target, dummyToken());
        assert.throw(() => evaluator.evaluate(indexCall));
    });

    it('visitSlice on list', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(),
            [1,2,3,4,5].map((x) => numNode(x.toString())),
        dummyToken());

        let slice : Expression;
        slice = new Slice(list, numNode("4"), numNode("5"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [5]);

        slice = new Slice(list, numNode("1"), numNode("3"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [2,3]);

        slice = new Slice(list, numNode("1"), null, dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [2,3,4,5]);

        slice = new Slice(list, null, numNode("3"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [1,2,3]);

        slice = new Slice(list, null, null, dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [1,2,3,4,5]);

        // out of range but OK
        slice = new Slice(list, numNode("1"), numNode("8"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [2,3,4,5]);

        // negatives = counting from end of list
        slice = new Slice(list, numNode("0"), numNode("-2"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), [1,2,3]);
    });

    it('visitSlice on string', function() {
        let evaluator = new Evaluator();
        let str = stringNode("foo bar baz");

        let slice : Expression;
        slice = new Slice(str, numNode("1"), numNode("2"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), "o");

        slice = new Slice(str, numNode("0"), numNode("3"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), "foo");

        slice = new Slice(str, numNode("4"), null, dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), "bar baz");

        slice = new Slice(str, numNode("0"), numNode("0"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), "");
    });

    it('visitSlice valid but empty', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(),
            [1,2,3,4,5].map((x) => numNode(x.toString())),
        dummyToken());

        let slice : Expression;
        slice = new Slice(list, numNode("0"), numNode("0"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), []);
        slice = new Slice(list, numNode("2"), numNode("2"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), []);
        slice = new Slice(list, numNode("10"), numNode("100"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), []);
        slice = new Slice(list, numNode("3"), numNode("1"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), []);
        slice = new Slice(list, numNode("4"), numNode("-5"), dummyToken());
        assert.deepEqual(evaluator.evaluate(slice), []);
    });

    it('visitSlice error: wrong start type', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(),
            [1,2,3,4,5].map((x) => numNode(x.toString())),
        dummyToken());

        let slice = new Slice(list, stringNode("foo"), numNode("5"), dummyToken());
        assert.throw(() => evaluator.evaluate(slice));
    });

    it('visitSlice error: wrong end type', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(),
            [1,2,3,4,5].map((x) => numNode(x.toString())),
        dummyToken());

        let slice = new Slice(list, numNode("1"), list, dummyToken());
        assert.throw(() => evaluator.evaluate(slice));
    });

    it('visitSlice error: wrong target type', function() {
        let evaluator = new Evaluator();
        let slice = new Slice(new True(dummyToken()), numNode("1"), numNode("2"), dummyToken());
        assert.throw(() => evaluator.evaluate(slice));
    });

    it('visitFor empty list', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(), [], dummyToken());
        let forExpr = new For(dummyToken(), idNode("x"), list, idNode("x"));
        assert.deepEqual(evaluator.evaluate(forExpr), []);
    });

    it('visitFor return elements as is', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(), [numNode("3"), numNode("5")], dummyToken());
        let forExpr = new For(dummyToken(), idNode("x"), list, idNode("x"));
        assert.deepEqual(evaluator.evaluate(forExpr), [3, 5]);
    });

    it('visitFor iterate over string', function() {
        let evaluator = new Evaluator();
        let forExpr = new For(dummyToken(), idNode("x"), stringNode("Minecraft"), idNode("x"));
        assert.deepEqual(evaluator.evaluate(forExpr), Array.from("Minecraft"));
        forExpr = new For(dummyToken(), idNode("x"), stringNode("abc"),
                          new Binop(idNode("x"), BinaryOperator.ADD, idNode("x")));
        assert.deepEqual(evaluator.evaluate(forExpr), ["aa", "bb", "cc"]);
    });

    it('visitFor add 1 to elements', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(), [numNode("3"), numNode("5")], dummyToken());
        let forExpr = new For(dummyToken(), idNode("x"), list,
                              new Binop(numNode("1"), BinaryOperator.ADD, idNode("x")));
        assert.deepEqual(evaluator.evaluate(forExpr), [4, 6]);
    });

    it('visitFor nested for expressions', function() {
        let evaluator = new Evaluator();
        let list1 = new List(dummyToken(), [numNode("10"), numNode("100")], dummyToken());
        let list2 = new List(dummyToken(), [numNode("1"), numNode("2"), numNode("3")], dummyToken());
        let forExpr = new For(dummyToken(), idNode("x"), list1,
                              new For(dummyToken(), idNode("y"), list2,
                              new Binop(idNode("x"), BinaryOperator.ADD, idNode("y"))));
        assert.deepEqual(evaluator.evaluate(forExpr), [[10+1, 10+2, 10+3], [100+1, 100+2, 100+3]]);
    });

    it('visitFor error: unbound variable', function() {
        let evaluator = new Evaluator();
        let list = new List(dummyToken(), [numNode("3"), numNode("5")], dummyToken());
        let forExpr = new For(dummyToken(), idNode("x"), list,
                              new Binop(idNode("x"), BinaryOperator.ADD, idNode("y")));
        assert.throw(() => evaluator.evaluate(forExpr));
    });

    it('visitFor error: wrong type of target', function() {
        let evaluator = new Evaluator();
        let forExpr = new For(dummyToken(), idNode("x"), numNode("0"), idNode("x"));
        assert.throw(() => evaluator.evaluate(forExpr));
    });

    it('visitPrint', function() {
        let evaluator = new Evaluator();
        // FIXME: check the stdout
        assert.equal(evaluator.evaluate(stringNode("visitPrint test")), "visitPrint test");
    });
});

describe("evaluator - store integration", () => {
    beforeEach(() => {
        STORE.clear();
    })

    it('visitAdvancement generated name', function() {
        let evaluator = new Evaluator();
        let expr = new Advancement(dummyToken(), null, [], dummyToken());
        let name = evaluator.evaluate(expr);
        assert.isTrue(STORE.has(name));
        assert.isTrue(name.startsWith("."), "Randomly generated advancement names should start with .");
        assert.equal(STORE.get(name)!.name, name);
    });

    it('visitAdvancement provided name', function() {
        let evaluator = new Evaluator();
        let expr = new Advancement(dummyToken(), stringNode("foo"), [], dummyToken());
        assert.equal(evaluator.evaluate(expr), "foo");
        assert.isTrue(STORE.has("foo"));
        assert.equal(STORE.get("foo")!.name, "foo");
    });

    it('visitAdvancement some fields provided', function() {
        let evaluator = new Evaluator();
        let title = "Congratulations, you've won!";
        let desc = "You are the 100,000th visitor to this website. Click [here] to claim your prize";
        let expr = new Advancement(dummyToken(), null, [
            new Title(dummyToken(), stringNode(title)),
            new Description(dummyToken(), stringNode(desc)),
        ], dummyToken());

        let name = evaluator.evaluate(expr);
        let advancement = STORE.get(name);
        assert.isNotNull(advancement);
        assert.isTrue(advancement instanceof Store.AdvancementValue);
        if (advancement instanceof Store.AdvancementValue) { // narrow down union type for TS
            assert.equal(advancement.name, name);
            assert.equal(advancement.title, title);
            assert.equal(advancement.description, desc);
            assert.isUndefined(advancement.iconItem);
            assert.isUndefined(advancement.parent);
        }
    });

    it('visitAdvancement all fields provided', function() {
        let evaluator = new Evaluator();
        let name = "netheriteBlock"
        let title = "Hardcore Miner";
        let desc = "Obtain a Block of Netherite";
        let parent = "diamondPick";
        let iconItem = "minecraft:netherite_block";
        let expr = new Advancement(dummyToken(), stringNode(name), [
            new Title(dummyToken(), stringNode(title)),
            new Description(dummyToken(), stringNode(desc)),
            new Parent(dummyToken(), stringNode(parent)),
            new Icon(dummyToken(), stringNode(iconItem)),
        ], dummyToken());

        assert.equal(evaluator.evaluate(expr), name);

        let advancement = STORE.get(name);
        assert.isNotNull(advancement);
        assert.isTrue(advancement instanceof Store.AdvancementValue);
        if (advancement instanceof Store.AdvancementValue) { // narrow down union type for TS
            assert.equal(advancement.name, name);
            assert.equal(advancement.title, title);
            assert.equal(advancement.description, desc);
            assert.equal(advancement.parent, parent);
            assert.equal(advancement.iconItem, iconItem);
        }
    });

    it('visitAdvancement error: wrong type for name', function() {
        let evaluator = new Evaluator();
        let expr = new Advancement(dummyToken(), numNode("410"), [], dummyToken());
        assert.throws(() => evaluator.evaluate(expr));
        assert.equal(STORE.size, 0, "Store should be empty");
    });

    it('visitAdvancement error: wrong type for field', function() {
        let evaluator = new Evaluator();
        let expr = new Advancement(dummyToken(), null, [
            new Title(dummyToken(), addXYFunc),
            new Description(dummyToken(), stringNode("add x to y?!?!")),
        ], dummyToken());
        assert.throws(() => evaluator.evaluate(expr));
        assert.equal(STORE.size, 0, "Store should be empty");
    });

    it('visitAdvancement error: name conflict', function() {
        let evaluator = new Evaluator();
        let expr = new Advancement(dummyToken(), stringNode("kaboom"), [], dummyToken());
        assert.equal(evaluator.evaluate(expr), "kaboom");
        assert.throws(() => evaluator.evaluate(expr), DSLNameConflictError);
    });

    it('parseTrigger consumeItem / ItemMatcher', function() {
        let evaluator = new Evaluator();
        let trigger = new ConsumeItem(dummyToken(), new ItemMatcher(dummyToken(), stringNode("carrot")), dummyToken());
        let emptyEnv = new EvaluatorEnv({});
        assert.deepEqual(evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")),
                         [new Store.ConsumeItem(new Store.ItemMatcher("carrot"))]);
    });

    it('parseTrigger InventoryChanged / TagMatcher', function() {
        let evaluator = new Evaluator();
        let trigger = new InventoryChanged(dummyToken(), new TagMatcher(dummyToken(), stringNode("TEST")), dummyToken());
        let emptyEnv = new EvaluatorEnv({});
        assert.deepEqual(evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")),
                         [new Store.InventoryChanged(new Store.TagMatcher("TEST"))]);
    });

    it('parseTrigger CombinedTrigger', function() {
        let evaluator = new Evaluator();
        let trigger1 = new InventoryChanged(dummyToken(), new TagMatcher(dummyToken(), stringNode("TEST")), dummyToken());
        let trigger2 = new ConsumeItem(dummyToken(), new TagMatcher(dummyToken(), stringNode("BEST")), dummyToken());
        let trigger = new CombinedTrigger(trigger1, trigger2);
        let emptyEnv = new EvaluatorEnv({});

        assert.deepEqual(evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")),
                         [new Store.InventoryChanged(new Store.TagMatcher("TEST")),
                          new Store.ConsumeItem(new Store.TagMatcher("BEST"))]);
    });

    it('parseTrigger error: Load in CombinedTrigger', function() {
        let evaluator = new Evaluator();
        let trigger1 = new Load(dummyToken());
        let trigger2 = new ConsumeItem(dummyToken(), new ItemMatcher(dummyToken(), stringNode("BEST")), dummyToken());
        let trigger = new CombinedTrigger(trigger1, trigger2);
        let emptyEnv = new EvaluatorEnv({});

        assert.throws(() => evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")));
    });

    it('parseTrigger error: Tick in CombinedTrigger', function() {
        let evaluator = new Evaluator();
        let trigger1 = new Tick(dummyToken());
        let trigger2 = new ConsumeItem(dummyToken(), new TagMatcher(dummyToken(), stringNode("BEST")), dummyToken());
        let trigger = new CombinedTrigger(trigger1, trigger2);
        let emptyEnv = new EvaluatorEnv({});

        assert.throws(() => evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")));
    });

    it('parseTrigger error: bad type of trigger value', function() {
        let evaluator = new Evaluator();
        let trigger = new InventoryChanged(dummyToken(), new TagMatcher(dummyToken(), new True(dummyToken())), dummyToken());
        let emptyEnv = new EvaluatorEnv({});

        assert.throws(() => evaluator.parseTrigger(trigger, emptyEnv, stringNode("dummy")));
    });

    it('parseCommands typed commands', function() {
        let evaluator = new Evaluator();
        let commands = [
            new Grant(dummyToken(), stringNode("test123")),
            new Revoke(dummyToken(), stringNode("test123")),
            new Execute(dummyToken(), stringNode("foobar")),
        ]
        let emptyEnv = new EvaluatorEnv({});

        assert.deepEqual(evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")),
                         ["advancement grant @p only test123",
                          "advancement revoke @p only test123",
                          "function foobar"]);
    });

    it('parseCommands error: wrong param type for typed commands', function() {
        let evaluator = new Evaluator();
        let commands: Command[];
        let emptyEnv = new EvaluatorEnv({});

        commands = [new Grant(dummyToken(), numNode("3"))]
        assert.throws(() => evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")));
        commands = [new Revoke(dummyToken(), numNode("2"))]
        assert.throws(() => evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")));
        commands = [new Execute(dummyToken(), numNode("1"))]
        assert.throws(() => evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")));
    });

    it('parseCommands raw commands as string', function() {
        let evaluator = new Evaluator();
        let commands = [
            new RawCommand(stringNode("tell @a foo")),
            new RawCommand(stringNode("tell @a bar"))
        ]
        let emptyEnv = new EvaluatorEnv({});

        assert.deepEqual(evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")),
                         ["tell @a foo", "tell @a bar"]);
    });
    it('parseCommands raw commands as list', function() {
        let evaluator = new Evaluator();
        let commands = [
            new RawCommand(new List(dummyToken(), [stringNode("tell @a foo"), stringNode("tell @a bar")], dummyToken()))
        ]
        let emptyEnv = new EvaluatorEnv({});

        assert.deepEqual(evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")),
                         ["tell @a foo", "tell @a bar"]);
    });

    it('parseCommands error: wrong param type for raw commands', function() {
        let evaluator = new Evaluator();
        let commands: Command[];
        let emptyEnv = new EvaluatorEnv({});

        commands = [
            new RawCommand(new List(dummyToken(), [stringNode("tell @a foo"), factorialFunc], dummyToken()))
        ];
        assert.throws(() => evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")));

        commands = [
            new RawCommand(new True(dummyToken()))
        ];
        assert.throws(() => evaluator.parseCommands(commands, emptyEnv, stringNode("dummy")));
    });

    it('visitOn ConsumeItem', function() {
        let evaluator = new Evaluator();
        let expr = new On(dummyToken(),
                          new ConsumeItem(dummyToken(),
                                          new ItemMatcher(dummyToken(), stringNode("golden_apple")), dummyToken()),
                         [new RawCommand(stringNode("tell @a someone ate a golden apple"))], dummyToken());

        let advName = evaluator.evaluate(expr);
        assert.isTrue(STORE.has(advName));
        assert.equal(STORE.size, 2);
        assert.equal(advName, ".adv.consumeitem0");

        let advancement = STORE.get(advName)!;
        assert.equal(advancement.name, advName);
        assert.isTrue(advancement instanceof Store.AdvancementValue);

        if (advancement instanceof Store.AdvancementValue) {
            // Grab the generated function name attached to the advancement
            let fnName = advancement.rewardFunction || "";
            assert.equal(fnName, ".consumeitem0");
            assert.isTrue(STORE.has(fnName));
            let fn = STORE.get(fnName)!;
            assert.isTrue(fn instanceof Store.FunctionValue);

            if (fn instanceof Store.FunctionValue) {
                assert.deepEqual(fn.commands, ["tell @a someone ate a golden apple"]);
                assert.equal(fn.name, fnName);
                assert.isUndefined(fn.tag);
            }
        }
    });

    it('visitOn InventoryChanged', function() {
        let evaluator = new Evaluator();
        let expr = new On(dummyToken(),
                          new InventoryChanged(dummyToken(),
                                          new ItemMatcher(dummyToken(), stringNode("golden_apple")), dummyToken()),
                         [new RawCommand(stringNode("say someone got a golden apple"))], dummyToken());

        let advName = evaluator.evaluate(expr);
        assert.isTrue(STORE.has(advName));
        assert.equal(STORE.size, 2);
        assert.equal(advName, ".adv.inventorychanged0");

        let advancement = STORE.get(advName)!;
        assert.equal(advancement.name, advName);
        assert.isTrue(advancement instanceof Store.AdvancementValue);

        if (advancement instanceof Store.AdvancementValue) {
            // Grab the generated function name attached to the advancement
            let fnName = advancement.rewardFunction || "";
            assert.equal(fnName, ".inventorychanged0");
            assert.isTrue(STORE.has(fnName));
            let fn = STORE.get(fnName)!;
            assert.isTrue(fn instanceof Store.FunctionValue);

            if (fn instanceof Store.FunctionValue) {
                assert.deepEqual(fn.commands, ["say someone got a golden apple"]);
                assert.equal(fn.name, fnName);
                assert.isUndefined(fn.tag);
            }
        }
    });

    // FIXME: add one for TagMatcher - I don't really understand the semantics -JL

    it('visitOn load', function() {
        let evaluator = new Evaluator();
        let expr = new On(dummyToken(),
                          new Load(dummyToken()),
                         [new RawCommand(stringNode("spreadplayers"))], dummyToken());
        evaluator.evaluate(expr);
        assert.equal(STORE.size, 1);
        let fn = STORE.get(STORE.keys().next().value);
        if (fn instanceof Store.FunctionValue) {
            assert.equal(fn.name, '.load0');
            assert.equal(fn.tag, "load");
            assert.deepEqual(fn.commands, ["spreadplayers"]);
        }
    });

    it('visitOn tick', function() {
        let evaluator = new Evaluator();
        let expr = new On(dummyToken(),
                          new Tick(dummyToken()),
                          // a lovely christmas present -JL
                         [new RawCommand(stringNode("loot give players @a loot coal_ore"))], dummyToken());
        evaluator.evaluate(expr);
        assert.equal(STORE.size, 1);
        let fn = STORE.get(STORE.keys().next().value);

        assert.isTrue(fn instanceof Store.FunctionValue);
        if (fn instanceof Store.FunctionValue) {
            assert.equal(fn.name, '.tick0');
            assert.equal(fn.tag, "tick");
            assert.deepEqual(fn.commands, ["loot give players @a loot coal_ore"]);
        }
    });

    it('visitOn multiple on blocks', function() {
        let evaluator = new Evaluator();
        let expr1 = new On(dummyToken(),
                            new ConsumeItem(dummyToken(),
                                            new ItemMatcher(dummyToken(), stringNode("golden_apple")), dummyToken()),
                            [new Grant(dummyToken(), stringNode("ate_golden_apple"))], dummyToken());
        let expr2 = new On(dummyToken(),
                            new Load(dummyToken()),
                            [new RawCommand(stringNode("say welcome!"))], dummyToken());

        evaluator.evaluate(expr1);
        evaluator.evaluate(expr2);
        evaluator.evaluate(expr1); // again, just for good measure
        let names = [".consumeitem0", ".adv.consumeitem0", ".load1", ".consumeitem2", ".adv.consumeitem2"];
        assert.equal(STORE.size, names.length);
        for (let name of names) {
            assert.isTrue(STORE.has(name), `expected store to contain ${name}, got ${Array.from(STORE.keys())}`);
        };
    });

    it('visitFunction random name', function() {
        let evaluator = new Evaluator();
        let expr = new MCFunction(dummyToken(), null,
                                [new Grant(dummyToken(), stringNode("minecraft:arbalistic"))], dummyToken());
        let fnName = evaluator.evaluate(expr);
        assert.equal(fnName, ".function0");
        assert.equal(STORE.size, 1);
        let fn = STORE.get(fnName);
        assert(fn instanceof Store.FunctionValue);
        if (fn instanceof Store.FunctionValue) {
            assert.equal(fn.name, fnName);
            assert.deepEqual(fn.commands, ["advancement grant @p only minecraft:arbalistic"]);
        }
    });

    it('visitFunction set name', function() {
        let evaluator = new Evaluator();
        let expr = new MCFunction(dummyToken(), stringNode("revoky"),
                                [new Revoke(dummyToken(), stringNode("minecraft:arbalistic"))], dummyToken());
        let fnName = evaluator.evaluate(expr);
        assert.equal(fnName, "revoky");
        assert.equal(STORE.size, 1);
        let fn = STORE.get(fnName);
        assert(fn instanceof Store.FunctionValue);
        if (fn instanceof Store.FunctionValue) {
            assert.equal(fn.name, fnName);
            assert.deepEqual(fn.commands, ["advancement revoke @p only minecraft:arbalistic"]);
        }
    });
});

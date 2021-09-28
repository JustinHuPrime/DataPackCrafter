import { assert } from "chai";
import { ASTNumber, ASTString, Begin, BinaryOperator, Binop, Call, Define, Expression, False, Id, If, Index, Let, List, True, UnaryOperator, Unop } from "../../src/ast/ast";
import Span, { Location } from "../../src/ast/span";
import Token, { TokenType } from "../../src/ast/token";
import { Evaluator } from "../../src/codeGenerator/evaluator";

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

describe("evaluator", () => {

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

    it('visitBinop modulo', function() {
        let evaluator = new Evaluator();
        let lhs = new ASTNumber(dummyToken("15"));
        let rhs = new ASTNumber(dummyToken("4"));
        let expr = new Binop(lhs, BinaryOperator.MOD, rhs);
        assert.equal(evaluator.evaluate(expr), 3);
    });

    it('visitBinop comparisons', function() {
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

    it('visitBinop divide by 0', function() {
        let evaluator = new Evaluator();
        let lhs = new ASTNumber(dummyToken("1"));
        let rhs = new ASTNumber(dummyToken("0"));
        let expr = new Binop(lhs, BinaryOperator.DIV, rhs);
        assert.throws(() => evaluator.evaluate(expr));
    });

    // TODO: check that only one branch gets evaluated at a time
    // TODO: one complex predicate
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

    it('visitUnop', function() {
        let evaluator = new Evaluator();
        let myNum = new ASTNumber(dummyToken("10"));
        let myBool = new True(dummyToken());
        assert.equal(evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NEG, myNum)), -10);
        assert.equal(evaluator.evaluate(
            new Unop(dummyToken(), UnaryOperator.NOT, myBool)), false);
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
        assert.deepEqual(evaluator.evaluate(indexCall), "a");
        indexCall = new Index(list, numNode("1"), dummyToken());
        assert.deepEqual(evaluator.evaluate(indexCall), "b");
        indexCall = new Index(list, numNode("2"), dummyToken());
        assert.deepEqual(evaluator.evaluate(indexCall), "c");
    });

    it('visitIndex on string', function() {
        let evaluator = new Evaluator();
        let list = stringNode("Abracadabra");
        let indexCall : Expression;
        indexCall = new Index(list, numNode("0"), dummyToken());
        assert.deepEqual(evaluator.evaluate(indexCall), "A");
        indexCall = new Index(list, numNode("4"), dummyToken());
        assert.deepEqual(evaluator.evaluate(indexCall), "c");
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
});

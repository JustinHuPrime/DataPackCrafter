import { assert } from "chai";
import { ASTNumber, BinaryOperator, Binop, Expression, False, If, True, UnaryOperator, Unop } from "../../src/ast/ast";
import Span, { Location } from "../../src/ast/span";
import Token, { TokenType } from "../../src/ast/token";
import { Evaluator } from "../../src/codeGenerator/evaluator";

function dummyToken(content?: string) {
    /**
     * Create a dummy token with the given string content
     */
    if (content === undefined) {
        content = "";
    }
    return new Token(TokenType.LITERAL, new Span(new Location(0, 0), new Location(0, content.length)), content);
}

describe("evaluator", () => {
    // Dummy, empty token to create AST nodes with

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
});

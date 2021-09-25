import { assert } from "chai";
import { ASTNumber, False, If, True } from "../../src/ast/ast";
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
});

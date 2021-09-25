import { assert } from "chai";
import { EvaluatorEnv, EvaluatorEnvMap } from "../../src/codeGenerator/evaluator";

describe("evaluatorEnv", () => {
    it('fetch', function() {
        let envMap : EvaluatorEnvMap = {"foo": "bar", "Five": 5}
        let env = new EvaluatorEnv(envMap);

        assert.equal(env.fetch("foo"), "bar");
        assert.equal(env.fetch("Five"), 5);
        assert.throws(() => env.fetch("missing"));
    });

    it('extend', function() {
        let envMap : EvaluatorEnvMap = {}
        let oldEnv = new EvaluatorEnv(envMap);
        let newEnv = oldEnv.extend("x", 123);
        assert.equal(newEnv.fetch("x"), 123);
        assert.throws(() => oldEnv.fetch("x"));
        assert.throws(() => newEnv.fetch("stillmissing"));
    });

    it('extend inPlace', function() {
        let envMap : EvaluatorEnvMap = {}
        let oldEnv = new EvaluatorEnv(envMap);
        let newEnv = oldEnv.extend("x", 123, true);

        assert.equal(oldEnv.fetch("x"), 123);
        assert.equal(newEnv.fetch("x"), 123);
    });
});

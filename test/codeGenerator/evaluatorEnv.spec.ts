import { assert } from "chai";
import {
  EvaluatorEnv,
  EvaluatorEnvMap,
} from "../../src/codeGenerator/evaluator";

describe("evaluatorEnv", () => {
  it("fetch", function () {
    let envMap: EvaluatorEnvMap = { foo: "bar", Five: 5 };
    let env = new EvaluatorEnv(envMap);

    assert.equal(env.fetch("foo"), "bar");
    assert.equal(env.fetch("Five"), 5);
    // Missing vars are undefined; these are handled by the evaluator
    assert.equal(env.fetch("missing"), undefined);
  });

  it("extend", function () {
    let envMap: EvaluatorEnvMap = {};
    let oldEnv = new EvaluatorEnv(envMap);
    let newEnv = oldEnv.extend("x", 123);
    assert.equal(newEnv.fetch("x"), 123);
    assert.equal(oldEnv.fetch("x"), undefined);
    assert.equal(newEnv.fetch("stillmissing"), undefined);
  });

  it("extend inPlace", function () {
    let envMap: EvaluatorEnvMap = {};
    let oldEnv = new EvaluatorEnv(envMap);
    let newEnv = oldEnv.extend("x", 123, true);

    assert.equal(oldEnv.fetch("x"), 123);
    assert.equal(newEnv.fetch("x"), 123);
  });
});

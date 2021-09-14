import { expect } from "chai";
import { greet } from "../src/greeter";

describe("greeter", () => {
  it("should greet everyone", () => {
    expect(greet()).to.equal("Hello, world!");
  });
});

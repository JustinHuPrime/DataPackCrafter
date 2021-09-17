import Token from "../ast/token";
import * as fs from "fs";

export default class Lexer {
  file: string;
  line: number;
  character: number;
  position: number;

  constructor(filename: string) {
    this.file = fs.readFileSync(filename, "utf8");
    this.line = 1;
    this.character = 1;
    this.position = 0;
  }

  lexRegular(): Token {
    throw new Error("Not yet implemented!"); // TODO
  }

  lexString(): Token {
    throw new Error("Not yet implemented!"); // TODO
  }
}

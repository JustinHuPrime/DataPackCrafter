import { File } from "../ast/ast";
import Options from "../options";

export default function codeGenerate(file: File, options: Options): void {
  console.log(file);
  console.log(options);
  throw new Error("Not yet implemented!"); // TODO
}

import { File } from "../ast/ast";
import Options from "../options";

export default function parse(filename: string, options: Options): File {
  console.log(filename);
  console.log(options);
  throw new Error("Not yet implemented!"); // TODO
}

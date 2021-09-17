import Ast from "../ast/ast";
import Options from "../options";

export default function parse(filename: string, options: Options): Ast {
  console.log(filename);
  console.log(options);
  return []; // TODO
}

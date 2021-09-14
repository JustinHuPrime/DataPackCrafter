import Ast from "../ast/ast";
import Options from "../options";

export default function parse(filenames: string[], options: Options): Ast[] {
  console.log(filenames);
  console.log(options);
  return []; // TODO
}

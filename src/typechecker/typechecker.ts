import Ast from "../ast/ast";
import Options from "../options";

export default function typecheck(asts: Ast[], options: Options): Ast[] {
  console.log(asts);
  console.log(options);
  return asts; // TODO
}

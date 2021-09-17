import Ast from "../ast/ast";
import Options from "../options";

export default function typecheck(ast: Ast, options: Options): Ast {
  console.log(ast);
  console.log(options);
  return ast; // TODO
}

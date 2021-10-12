import parseArgs, { ArgumentError } from "./args";
import { Evaluator, EvaluatorEnv } from "./codeGenerator/evaluator";
import { DSLEvaluationError } from "./codeGenerator/exceptions";
import { writeStore } from "./codeGenerator/writer";
import { LexerError } from "./parser/lexer";
import Parser, { ParserError } from "./parser/parser";

try {
  if (process.argv.length <= 2)
    throw new ArgumentError(
      "DataPackCrafter: error: expected at least one input file to process",
    );

  const [filename, options] = parseArgs(process.argv.slice(2));

  const file = new Parser(filename).parse();

  const env = new EvaluatorEnv({});
  const evaluator = new Evaluator(file.datapackDecl.id.id);
  file.expressions.forEach((expr) => {
    evaluator.evaluate(expr, env);
  });

  writeStore(file.datapackDecl.id.id, options.outputFile);

  console.log(`Datapack compiled successfully! Output file: ${options.outputFile}`);
  process.exitCode = 0;
} catch (e) {
  if (e instanceof DSLEvaluationError) {
    console.error(`DataPackCrafter: error: ${e.message}`);
  } else if (e instanceof ParserError || e instanceof LexerError) {
    console.error(`${e.message}`);
  } else {
    console.error(
      `DataPackCrafter: internal error: unrecognized exception ${e}`,
    );
  }
}

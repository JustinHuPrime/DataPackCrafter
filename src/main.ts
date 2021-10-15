import parseArgs, { ArgumentError } from "./args";
import { Evaluator, EvaluatorEnv } from "./codeGenerator/evaluator";
import { DSLEvaluationError } from "./codeGenerator/exceptions";
import { writeStore } from "./codeGenerator/writer";
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

  process.exitCode = 0;
} catch (e) {
  process.exitCode = 1;
  if (e instanceof DSLEvaluationError) {
    const filename = process.argv[2];
    if (e.astNode != null) {
      const { line, character } = e.astNode.span.start;
      console.error(`${filename}:${line}:${character} ${e.name}: ${e.message}`);
    } else {
      console.error(`${filename}:${e.name}: ${e.message}`);
    }
  } else if (e instanceof ParserError) {
    if (e.line !== null && e.character !== null) {
      console.error(
        `${e.filename}:${e.line}:${e.character}: ${e.name}: ${e.message}`,
      );
    } else {
      console.error(`${e.filename}: ${e.name}: ${e.message}`);
    }
  } else {
    console.error(
      `DataPackCrafter: internal error: unrecognized exception ${e}`,
    );
  }
}

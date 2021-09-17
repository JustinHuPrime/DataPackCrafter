import parse from "./parser/parser";
import codeGenerate from "./codeGenerator/codeGenerator";
import parseArgs, { ArgumentError } from "./args";

try {
  if (process.argv.length <= 2)
    throw new ArgumentError(
      "DataPackCrafter: error: expected at least one input file to process",
    );

  const [filename, options] = parseArgs(process.argv.slice(2));

  codeGenerate(parse(filename, options), options);

  process.exitCode = 0;
} catch (e) {
  if (e instanceof ArgumentError) {
    console.error(`DataPackCrafter: error: ${e.message}`);
  } else {
    console.error(
      `DataPackCrafter: internal error: unrecognized exception ${e}`,
    );
  }
}

import Options from "./options";

/**
 * an error in the user arguments
 */
export class ArgumentError extends Error {}

/**
 * parse process arguments
 *
 * @param argv process.argv.splice(2)
 * @returns tuple containing array of filenames and options object
 */
export default function parseArgs(argv: string[]): [string[], Options] {
  const filenames: string[] = [];
  const options: Options = {
    outputFile: "./pack.zip",
  };
  enum ParseState {
    OPTION_PARAM,
    ARG,
    ALL_ARGS,
  }
  let parseState: ParseState = ParseState.ARG;
  let optionString: string = "";
  for (const arg of argv) {
    switch (parseState) {
      case ParseState.OPTION_PARAM: {
        switch (optionString) {
          case "-o": {
            parseState = ParseState.ARG;
            options.outputFile = arg;
            break;
          }
        }
        break;
      }
      case ParseState.ARG: {
        switch (arg) {
          case "-o": {
            parseState = ParseState.OPTION_PARAM;
            optionString = arg;
            break;
          }
          case "--": {
            parseState = ParseState.ALL_ARGS;
            break;
          }
          default: {
            if (arg.startsWith("-"))
              throw new ArgumentError(`unrecognized option: '${arg}'`);

            filenames.push(arg);
          }
        }
        break;
      }
      case ParseState.ALL_ARGS: {
        filenames.push(arg);
        break;
      }
    }
  }

  return [filenames, options];
}

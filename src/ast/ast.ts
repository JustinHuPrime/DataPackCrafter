export default class Ast {
  span: Span;

  constructor(span: Span) {
    this.span = span;
  }
}

export class Span {
  start: {
    line: number;
    character: number;
  };
  end: {
    line: number;
    character: number;
  };

  constructor(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ) {
    this.start = {
      line: startLine,
      character: startCharacter,
    };
    this.end = {
      line: endLine,
      character: endCharacter,
    };
  }
}

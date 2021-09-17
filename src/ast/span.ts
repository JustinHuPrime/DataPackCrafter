export default class Span {
  start: Location;
  end: Location;

  constructor(start: Location, end: Location) {
    this.start = start;
    this.end = end;
  }
}

export class Location {
  line: number;
  character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export function merge(a: Span, b: Span): Span {
  return new Span(
    new Location(
      Math.min(a.start.line, b.start.line),
      Math.min(a.start.character, b.start.character),
    ),
    new Location(
      Math.max(a.end.line, b.end.line),
      Math.max(a.end.character, b.end.character),
    ),
  );
}

export interface Spannable {
  span: Span;
}

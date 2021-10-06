import { Ast } from "../ast/ast";

/**
 * Generic class for evaluator errors.
 * @astNode the AST node that caused the error
 * @message a detailed description of what went wrong
 */
export class DSLEvaluationError extends Error {
  astNode: Ast | null;

  constructor(astNode: Ast | null, message: string) {
    super(message);
    this.name = "DSLEvaluationError";
    this.astNode = astNode;
  }
}

/**
 * Error thrown when referencing an unknown variable, advancement, or Minecraft function
 */
export class DSLReferenceError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLReferenceError";
    this.astNode = astNode;
  }
}

/**
 * Math error (overflow or divide by zero)
 */
export class DSLMathError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLMathError";
    this.astNode = astNode;
  }
}

/**
 * Malformed expressions (e.g. let with mismatched argument lists)
 */
export class DSLSyntaxError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLSyntaxError";
    this.astNode = astNode;
  }
}

/**
 * Runtime type errors
 */
export class DSLTypeError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLTypeError";
    this.astNode = astNode;
  }
}

/**
 * Error to represent out-of-range array access
 */
export class DSLIndexError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLIndexError";
    this.astNode = astNode;
  }
}

/**
 * Minecraft identifier name conflict
 */
export class DSLNameConflictError extends DSLEvaluationError {
  constructor(astNode: Ast | null, message: string) {
    super(astNode, message);
    this.name = "DSLNameConflictError";
    this.astNode = astNode;
  }
}

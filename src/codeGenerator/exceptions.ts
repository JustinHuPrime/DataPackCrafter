import { Expression } from "../ast/ast";

/**
 * Generic class for evaluator errors.
 * @expr    the expression that caused the error
 * @message a detailed description of what went wrong
 */
export class DSLEvaluationError extends Error {
    expr: Expression | null;

    constructor(expr: Expression | null, message: string) {
        super(message);
        this.name = "DSLEvaluationError"
        this.expr = expr;
    }
}

/**
 * Error thrown when using an unknown (unbound) variable
 */
export class DSLReferenceError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLReferenceError"
        this.expr = expr;
    }
}

/**
 * Math error (overflow or divide by zero)
 */
export class DSLMathError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLMathError"
        this.expr = expr;
    }
}

/**
 * Malformed expressions (e.g. let with mismatched argument lists)
 */
export class DSLSyntaxError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLSyntaxError"
        this.expr = expr;
    }
}

/**
 * Runtime type errors
 */
export class DSLTypeError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLTypeError"
        this.expr = expr;
    }
}

/**
 * Error to represent out-of-range array access
 */
 export class DSLIndexError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLIndexError"
        this.expr = expr;
    }
}

/**
 * Minecraft identifier name conflict
 */
 export class DSLNameConflictError extends DSLEvaluationError {
    constructor(expr: Expression | null, message: string) {
        super(expr, message);
        this.name = "DSLNameConflictError"
        this.expr = expr;
    }
}

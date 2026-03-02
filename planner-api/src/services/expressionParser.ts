/**
 * expressionParser.ts – Sprint 43
 *
 * Recursive-Descent parser for arithmetic expressions.
 * Supports: +, -, *, /, parentheses, integer and decimal numbers.
 * No eval – pure TypeScript implementation.
 *
 * Grammar:
 *   expr   = term   (('+' | '-') term)*
 *   term   = factor (('*' | '/') factor)*
 *   factor = number | '(' expr ')' | '-' factor
 *   number = [0-9]+('.'[0-9]+)?
 *
 * Examples:
 *   2500-1632  → 868
 *   600+150*2  → 900
 *   (300+200)*2 → 1000
 */

export class ExpressionParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ExpressionParseError'
    }
}

class Parser {
    private pos = 0

    constructor(private readonly input: string) {}

    /** Skip whitespace characters. */
    private skipWs(): void {
        while (this.pos < this.input.length && this.input[this.pos] === ' ') {
            this.pos++
        }
    }

    /** Peek at the current character without advancing. */
    private peek(): string | undefined {
        this.skipWs()
        return this.input[this.pos]
    }

    /** Consume and return the current character. */
    private consume(): string {
        this.skipWs()
        if (this.pos >= this.input.length) {
            throw new ExpressionParseError('Unexpected end of expression')
        }
        return this.input[this.pos++]
    }

    /** Parse a number literal. */
    private parseNumber(): number {
        this.skipWs()
        const start = this.pos
        // Optional leading sign is handled by parseFactor (unary minus)
        while (
            this.pos < this.input.length &&
            (this.input[this.pos] >= '0' && this.input[this.pos] <= '9' ||
                this.input[this.pos] === '.')
        ) {
            this.pos++
        }
        if (this.pos === start) {
            const ch = this.input[this.pos] ?? 'EOF'
            throw new ExpressionParseError(`Unexpected character '${ch}' at position ${this.pos}`)
        }
        const raw = this.input.slice(start, this.pos)
        const value = Number(raw)
        if (Number.isNaN(value)) {
            throw new ExpressionParseError(`Invalid number literal '${raw}'`)
        }
        return value
    }

    /** factor = number | '(' expr ')' | '-' factor */
    private parseFactor(): number {
        const ch = this.peek()
        if (ch === '(') {
            this.consume() // consume '('
            const value = this.parseExpr()
            this.skipWs()
            if (this.peek() !== ')') {
                throw new ExpressionParseError('Expected closing parenthesis')
            }
            this.consume() // consume ')'
            return value
        }
        if (ch === '-') {
            this.consume() // consume '-'
            return -this.parseFactor()
        }
        return this.parseNumber()
    }

    /** term = factor (('*' | '/') factor)* */
    private parseTerm(): number {
        let value = this.parseFactor()
        while (true) {
            const op = this.peek()
            if (op !== '*' && op !== '/') break
            this.consume()
            const right = this.parseFactor()
            if (op === '*') {
                value *= right
            } else {
                if (right === 0) throw new ExpressionParseError('Division by zero')
                value /= right
            }
        }
        return value
    }

    /** expr = term (('+' | '-') term)* */
    parseExpr(): number {
        let value = this.parseTerm()
        while (true) {
            const op = this.peek()
            if (op !== '+' && op !== '-') break
            this.consume()
            const right = this.parseTerm()
            if (op === '+') {
                value += right
            } else {
                value -= right
            }
        }
        return value
    }

    /** Parse the full input and assert nothing remains. */
    parse(): number {
        const value = this.parseExpr()
        this.skipWs()
        if (this.pos !== this.input.length) {
            throw new ExpressionParseError(
                `Unexpected character '${this.input[this.pos]}' at position ${this.pos}`,
            )
        }
        return value
    }
}

/**
 * Evaluate an arithmetic expression string.
 *
 * @param expression - The expression to evaluate (e.g. "2500-1632", "(300+200)*2")
 * @returns The numeric result
 * @throws ExpressionParseError if the expression is invalid
 */
export function evaluate(expression: string): number {
    if (!expression || expression.trim() === '') {
        throw new ExpressionParseError('Empty expression')
    }
    return new Parser(expression.trim()).parse()
}

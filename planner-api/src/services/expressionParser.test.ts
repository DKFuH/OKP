/**
 * expressionParser.test.ts – Sprint 43
 *
 * Unit tests for the Recursive-Descent arithmetic expression parser.
 * Covers the examples from the specification and various edge cases.
 */
import { describe, expect, it } from 'vitest'
import { evaluate, ExpressionParseError } from './expressionParser.js'

describe('expressionParser – specification examples', () => {
    it('evaluates 2500-1632 to 868', () => {
        expect(evaluate('2500-1632')).toBe(868)
    })

    it('evaluates 600+150*2 to 900 (operator precedence)', () => {
        expect(evaluate('600+150*2')).toBe(900)
    })

    it('evaluates (300+200)*2 to 1000 (parentheses)', () => {
        expect(evaluate('(300+200)*2')).toBe(1000)
    })

    it('evaluates 600+150 to 750', () => {
        expect(evaluate('600+150')).toBe(750)
    })
})

describe('expressionParser – arithmetic operations', () => {
    it('evaluates a plain number', () => {
        expect(evaluate('42')).toBe(42)
    })

    it('evaluates division: 10/2 to 5', () => {
        expect(evaluate('10/2')).toBe(5)
    })

    it('evaluates nested parentheses: (2+3)*(4-1) to 15', () => {
        expect(evaluate('(2+3)*(4-1)')).toBe(15)
    })

    it('evaluates unary minus: -5+10 to 5', () => {
        expect(evaluate('-5+10')).toBe(5)
    })

    it('evaluates multiple additions: 1+2+3 to 6', () => {
        expect(evaluate('1+2+3')).toBe(6)
    })

    it('evaluates expression resulting in a negative number: 10-20 to -10', () => {
        expect(evaluate('10-20')).toBe(-10)
    })
})

describe('expressionParser – error cases', () => {
    it('throws ExpressionParseError for alphabetic input', () => {
        expect(() => evaluate('abc')).toThrow(ExpressionParseError)
    })

    it('throws ExpressionParseError for empty string', () => {
        expect(() => evaluate('')).toThrow(ExpressionParseError)
    })

    it('throws ExpressionParseError for mismatched parentheses', () => {
        expect(() => evaluate('(2+3')).toThrow(ExpressionParseError)
    })

    it('throws ExpressionParseError for division by zero', () => {
        expect(() => evaluate('5/0')).toThrow(ExpressionParseError)
    })
})

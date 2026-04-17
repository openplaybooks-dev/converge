/**
 * Tests for the duration string parser.
 */

import { describe, it, expect } from 'vitest';
import { parseDuration } from '../../src/schedule/duration.ts';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('5s')).toBe(5_000);
    expect(parseDuration('15s')).toBe(15_000);
    expect(parseDuration('1s')).toBe(1_000);
    expect(parseDuration('0s')).toBe(0);
  });

  it('should parse minutes', () => {
    expect(parseDuration('1m')).toBe(60_000);
    expect(parseDuration('5m')).toBe(300_000);
  });

  it('should parse hours', () => {
    expect(parseDuration('1h')).toBe(3_600_000);
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('should parse milliseconds', () => {
    expect(parseDuration('500ms')).toBe(500);
    expect(parseDuration('100ms')).toBe(100);
  });

  it('should parse fractional values', () => {
    expect(parseDuration('1.5s')).toBe(1_500);
    expect(parseDuration('1.5m')).toBe(90_000);
    expect(parseDuration('0.5h')).toBe(1_800_000);
  });

  it('should handle whitespace', () => {
    expect(parseDuration(' 5s ')).toBe(5_000);
    expect(parseDuration('  1m  ')).toBe(60_000);
  });

  it('should throw for invalid input', () => {
    expect(() => parseDuration('')).toThrow('Invalid duration');
    expect(() => parseDuration('abc')).toThrow('Invalid duration');
    expect(() => parseDuration('15')).toThrow('Invalid duration');
    expect(() => parseDuration('s')).toThrow('Invalid duration');
    expect(() => parseDuration('5x')).toThrow('Invalid duration');
    expect(() => parseDuration('-5s')).toThrow('Invalid duration');
  });
});

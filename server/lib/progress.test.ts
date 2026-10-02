import { describe, expect, it } from 'vitest';
import { creditBeat, isWatched, pathPercent } from './progress.js';
import { grade, validQuestions } from '../services/quiz.js';
import { parseIsoDuration } from '../services/youtube.js';
import { hostAllowed } from '../services/sourcing.js';

const t0 = new Date('2026-10-01T10:00:00Z');
const at = (s: number) => new Date(t0.getTime() + s * 1000);

describe('creditBeat', () => {
  it('gives no credit on the first beat', () => {
    expect(creditBeat({ watchedSec: 0, lastPositionSec: 0, lastBeatAt: null }, 5, t0).credited).toBe(0);
  });
  it('credits normal playback', () => {
    const r = creditBeat({ watchedSec: 0, lastPositionSec: 0, lastBeatAt: t0 }, 10, at(10));
    expect(r.credited).toBe(10);
    expect(r.watchedSec).toBe(10);
  });
  it('gives nothing for seeking ahead', () => {
    expect(creditBeat({ watchedSec: 20, lastPositionSec: 20, lastBeatAt: t0 }, 600, at(10)).credited).toBe(0);
  });
  it('gives nothing for rewinding', () => {
    expect(creditBeat({ watchedSec: 20, lastPositionSec: 120, lastBeatAt: t0 }, 30, at(10)).credited).toBe(0);
  });
  it('caps credit after a long gap', () => {
    const r = creditBeat({ watchedSec: 0, lastPositionSec: 0, lastBeatAt: t0 }, 25, at(300));
    expect(r.credited).toBeLessThanOrEqual(30);
  });
  it('cannot be gamed by rapid beats', () => {
    let s = { watchedSec: 0, lastPositionSec: 0, lastBeatAt: t0 as Date | null };
    for (let i = 1; i <= 100; i++) s = creditBeat(s, i * 30, at(i * 0.1));
    expect(s.watchedSec).toBeLessThan(30);
  });
});

describe('completion', () => {
  it('needs 80% watched', () => {
    expect(isWatched(79, 100)).toBe(false);
    expect(isWatched(80, 100)).toBe(true);
    expect(isWatched(1000, null)).toBe(false);
  });
  it('counts items and quizzes', () => {
    expect(pathPercent(4, 8, 0, 4)).toBe(33);
    expect(pathPercent(8, 8, 4, 4)).toBe(100);
    expect(pathPercent(0, 0, 0, 0)).toBe(0);
  });
});

describe('quiz', () => {
  const qs = [{ correctIndex: 0 }, { correctIndex: 1 }, { correctIndex: 2 }];
  it('passes at 2 of 3', () => {
    expect(grade(qs, [0, 1, 3])).toEqual({ score: 2, passed: true });
    expect(grade(qs, [0, 0, 0])).toEqual({ score: 1, passed: false });
  });
  it('drops malformed questions', () => {
    expect(validQuestions([
      { prompt: 'ok', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
      { prompt: 'bad index', options: ['a', 'b', 'c', 'd'], correctIndex: 4 },
      { prompt: 'three options', options: ['a', 'b', 'c'], correctIndex: 0 },
    ])).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('parses YouTube durations', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT15M')).toBe(900);
    expect(parseIsoDuration('garbage')).toBe(0);
  });
  it('only allows https on allow-listed domains', () => {
    expect(hostAllowed('https://www.khanacademy.org/x', ['khan'])).toBe('khan');
    expect(hostAllowed('https://evil-khanacademy.org/x', ['khan'])).toBeNull();
    expect(hostAllowed('http://www.khanacademy.org/x', ['khan'])).toBeNull();
    expect(hostAllowed('https://www.coursera.org/learn/x', ['khan'])).toBeNull();
  });
});

/** A YouTube item counts as done once this share of it has really been watched. */
export const WATCH_THRESHOLD = 0.8;
/** The player sends a heartbeat about every 10 s; credit at most this much per beat. */
export const MAX_BEAT_SEC = 15;

export interface BeatState { watchedSec: number; lastPositionSec: number; lastBeatAt: Date | null }

/**
 * Credit watch time from one heartbeat. Only forward, real-time-paced
 * playback counts: seeking ahead, replaying and beats faster than wall-clock
 * time earn nothing, so skipping to the end never completes a video.
 */
export function creditBeat(prev: BeatState, positionSec: number, now: Date): BeatState & { credited: number } {
  const pos = Math.max(0, Math.floor(positionSec));
  let credited = 0;
  if (prev.lastBeatAt) {
    const elapsed = Math.min(MAX_BEAT_SEC, Math.max(0, (now.getTime() - prev.lastBeatAt.getTime()) / 1000));
    const advanced = pos - prev.lastPositionSec;
    // Allow a little slack for timer jitter and playback at up to 2x speed.
    if (advanced > 0 && advanced <= elapsed * 2 + 2) credited = Math.min(advanced, Math.ceil(elapsed * 2));
  }
  return { watchedSec: prev.watchedSec + credited, lastPositionSec: pos, lastBeatAt: now, credited };
}

export function isWatched(watchedSec: number, durationSec: number | null | undefined): boolean {
  if (!durationSec || durationSec <= 0) return false;
  return watchedSec >= durationSec * WATCH_THRESHOLD;
}

/** Path progress: every item and every module check is one unit. */
export function pathPercent(itemsDone: number, itemsTotal: number, quizzesPassed: number, quizzesTotal: number): number {
  const total = itemsTotal + quizzesTotal;
  if (total === 0) return 0;
  return Math.round(((itemsDone + quizzesPassed) / total) * 100);
}

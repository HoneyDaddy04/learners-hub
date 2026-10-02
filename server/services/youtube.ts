const API = 'https://www.googleapis.com/youtube/v3';

export interface Video {
  id: string;
  title: string;
  channel: string;
  durationSec: number;
  views: number;
  publishedAt: string;
  thumbnailUrl?: string;
  embeddable: boolean;
}

/** ISO 8601 duration (PT1H2M3S) to seconds. */
export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

function key() {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error('YOUTUBE_API_KEY is not set');
  return k;
}

async function get(path: string, params: Record<string, string>) {
  const url = new URL(`${API}/${path}`);
  Object.entries({ ...params, key: key() }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<{ items?: any[] }>;
}

/** search.list costs 100 quota units per call: callers cache results per role. */
export async function searchVideoIds(query: string, max = 6): Promise<string[]> {
  const data = await get('search', {
    part: 'id',
    q: query,
    type: 'video',
    maxResults: String(max),
    safeSearch: 'strict',
    relevanceLanguage: 'en',
    videoEmbeddable: 'true',
  });
  return (data.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
}

export async function getVideos(ids: string[]): Promise<Video[]> {
  if (ids.length === 0) return [];
  const data = await get('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.slice(0, 50).join(',') });
  return (data.items ?? []).map((v) => ({
    id: v.id,
    title: v.snippet?.title ?? '',
    channel: v.snippet?.channelTitle ?? '',
    durationSec: parseIsoDuration(v.contentDetails?.duration ?? ''),
    views: Number(v.statistics?.viewCount ?? 0),
    publishedAt: v.snippet?.publishedAt ?? '',
    thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
    embeddable: v.status?.embeddable !== false,
  }));
}

/** Quality floor for a learning video: embeddable, 3 min to 4 h, some audience. */
export function isUsableVideo(v: Video): boolean {
  return v.embeddable && v.durationSec >= 180 && v.durationSec <= 4 * 3600 && v.views >= 2000;
}

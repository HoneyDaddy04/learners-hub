import { generateJson, searchGroundedJson, Type } from './ai.js';
import { getVideos, isUsableVideo, searchVideoIds, type Video } from './youtube.js';
import { generateQuiz, type QuizQuestion } from './quiz.js';

export const SOURCE_DOMAINS: Record<string, string[]> = {
  khan: ['khanacademy.org'],
  fcc: ['freecodecamp.org'],
  mslearn: ['learn.microsoft.com', 'support.microsoft.com'],
  google: ['support.google.com', 'grow.google', 'skillshop.withgoogle.com'],
  coursera: ['coursera.org'],
  ocw: ['ocw.mit.edu'],
  openlearn: ['open.edu'],
};
export const SOURCE_KEYS = ['youtube', ...Object.keys(SOURCE_DOMAINS)] as const;

export interface DraftItem {
  source: 'youtube' | 'web';
  externalId?: string;
  url: string;
  title: string;
  provider: string;
  format: 'video' | 'course' | 'article';
  durationSec?: number;
  thumbnailUrl?: string;
  why: string;
}
export interface DraftModule { title: string; summary: string; items: DraftItem[]; quiz: QuizQuestion[] }
export interface DraftPath { title: string; description: string; level: string; modules: DraftModule[] }

export interface SourcingInput { role: string; context?: string; sources: string[] }

interface Plan {
  title: string;
  description: string;
  level: string;
  modules: { title: string; summary: string; youtubeQueries: string[]; webTopic: string }[];
}

type Candidate = { cid: string; item: Omit<DraftItem, 'why'>; views?: number };

export function cacheKey(i: SourcingInput) {
  return [i.role.trim().toLowerCase(), (i.context ?? '').trim().toLowerCase(), [...i.sources].sort().join(',')].join('|');
}

export function hostAllowed(url: string, sources: string[]): string | null {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const s of sources) {
    for (const d of SOURCE_DOMAINS[s] ?? []) if (host === d || host.endsWith('.' + d)) return s;
  }
  return null;
}

async function linkWorks(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 LearnersHub link check' } });
    return res.status < 400;
  } catch {
    return false;
  }
}

const PROVIDER: Record<string, string> = {
  khan: 'Khan Academy', fcc: 'freeCodeCamp', mslearn: 'Microsoft', google: 'Google',
  coursera: 'Coursera (free to audit)', ocw: 'MIT OpenCourseWare', openlearn: 'OpenLearn',
};

async function planPath(input: SourcingInput): Promise<Plan> {
  return generateJson<Plan>(
    `You design short, practical learning paths for employees of small and medium businesses.
Role: ${input.role}
Context: ${input.context || 'none given'}
Design a path of exactly 4 modules ordered from fundamentals to applied skills. For each module give:
- a short title and a one-sentence summary
- 2 YouTube search queries likely to find a clear, free tutorial (plain English, no channel names)
- a short web topic to search for a free course or article
Also give a path title (role + "foundations" style, max 6 words), a 1-2 sentence description, and a level.`,
    {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        level: { type: Type.STRING },
        modules: {
          type: Type.ARRAY,
          minItems: '4',
          maxItems: '4',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              youtubeQueries: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: '1', maxItems: '2' },
              webTopic: { type: Type.STRING },
            },
            required: ['title', 'summary', 'youtubeQueries', 'webTopic'],
          },
        },
      },
      required: ['title', 'description', 'level', 'modules'],
    },
  );
}

async function youtubeCandidates(queries: string[], seen: Set<string>): Promise<Candidate[]> {
  const ids = (await Promise.all(queries.map((q) => searchVideoIds(q).catch(() => [] as string[])))).flat();
  const fresh = [...new Set(ids)].filter((id) => !seen.has(id));
  const videos: Video[] = (await getVideos(fresh)).filter(isUsableVideo).sort((a, b) => b.views - a.views).slice(0, 6);
  videos.forEach((v) => seen.add(v.id));
  return videos.map((v) => ({
    cid: `yt:${v.id}`,
    views: v.views,
    item: {
      source: 'youtube', externalId: v.id, url: `https://www.youtube.com/watch?v=${v.id}`, title: v.title,
      provider: `${v.channel} on YouTube`, format: 'video', durationSec: v.durationSec, thumbnailUrl: v.thumbnailUrl,
    },
  }));
}

async function webCandidates(topic: string, role: string, sources: string[]): Promise<Candidate[]> {
  const webSources = sources.filter((s) => SOURCE_DOMAINS[s]);
  if (webSources.length === 0) return [];
  const domains = webSources.flatMap((s) => SOURCE_DOMAINS[s]);
  const found = await searchGroundedJson<{ title?: string; url?: string; format?: string }>(
    `Find up to 3 free, publicly accessible lessons, courses or articles about "${topic}" useful for a ${role}.
Only use pages on these sites: ${domains.join(', ')}.
Reply with ONLY a JSON array like [{"title": "...", "url": "https://...", "format": "course" | "article"}]. Use real URLs you found.`,
  ).catch(() => []);
  const out: Candidate[] = [];
  for (const f of found) {
    if (!f.url || !f.title) continue;
    const src = hostAllowed(f.url, webSources);
    if (!src || !(await linkWorks(f.url))) continue;
    out.push({
      cid: `web:${out.length}:${f.url}`,
      item: { source: 'web', url: f.url, title: f.title, provider: PROVIDER[src] ?? src, format: f.format === 'article' ? 'article' : 'course' },
    });
  }
  return out;
}

async function selectItems(plan: Plan, cands: Candidate[][]) {
  const listing = plan.modules
    .map((m, i) => `Module ${i}: ${m.title} - ${m.summary}\n` + cands[i].map((c) =>
      `  [${c.cid}] ${c.item.format} | ${c.item.title} | ${c.item.provider}` +
      (c.item.durationSec ? ` | ${Math.round(c.item.durationSec / 60)} min` : '') + (c.views ? ` | ${c.views} views` : '')).join('\n'))
    .join('\n\n');
  return generateJson<{ modules: { moduleIndex: number; picks: { cid: string; why: string }[] }[] }>(
    `Pick the best free learning items for each module of a path for: ${plan.title}.
Rules: 2-3 items per module, only from that module's candidates, prefer clear beginner-friendly tutorials under 60 minutes,
mix formats when good options exist, order them in the best learning sequence. "why" is one short sentence for the reviewer.
Candidates:
${listing}`,
    {
      type: Type.OBJECT,
      properties: {
        modules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              moduleIndex: { type: Type.INTEGER },
              picks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { cid: { type: Type.STRING }, why: { type: Type.STRING } }, required: ['cid', 'why'] } },
            },
            required: ['moduleIndex', 'picks'],
          },
        },
      },
      required: ['modules'],
    },
  );
}

export type Progress = (step: number, label: string) => void;

/** Full AI sourcing run. Produces a draft only; nothing is visible to staff until approved. */
export async function sourcePath(input: SourcingInput, onStep: Progress = () => {}): Promise<DraftPath> {
  onStep(0, 'Mapping the skills for the role');
  const plan = await planPath(input);

  onStep(1, 'Searching allowed free sources');
  const seen = new Set<string>();
  const useYoutube = input.sources.includes('youtube');
  const cands: Candidate[][] = [];
  // Sequential per module keeps YouTube de-duplication deterministic; queries inside run in parallel.
  for (const m of plan.modules) {
    const [yt, web] = await Promise.all([
      useYoutube ? youtubeCandidates(m.youtubeQueries, seen) : Promise.resolve([]),
      webCandidates(m.webTopic, input.role, input.sources),
    ]);
    cands.push([...yt, ...web]);
  }

  onStep(2, 'Choosing and ordering lessons');
  const picked = await selectItems(plan, cands);
  const modules: DraftModule[] = plan.modules.map((m, i) => {
    const byId = new Map(cands[i].map((c) => [c.cid, c]));
    const picks = picked.modules.find((p) => p.moduleIndex === i)?.picks ?? [];
    let items = picks.flatMap((p) => (byId.has(p.cid) ? [{ ...byId.get(p.cid)!.item, why: p.why }] : []));
    if (items.length === 0) items = cands[i].slice(0, 2).map((c) => ({ ...c.item, why: 'Best available match for this module.' }));
    return { title: m.title, summary: m.summary, items, quiz: [] };
  }).filter((m) => m.items.length > 0);

  onStep(3, 'Writing module checks');
  await Promise.all(modules.map(async (m) => {
    m.quiz = await generateQuiz(plan.title, m).catch(() => []);
  }));

  return { title: plan.title, description: plan.description, level: plan.level, modules };
}

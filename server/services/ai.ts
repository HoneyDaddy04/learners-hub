import { GoogleGenAI, Type, type Schema } from '@google/genai';

export { Type };

let client: GoogleGenAI | null = null;

/** Vertex AI Gemini via Application Default Credentials (Cloud Run service account in prod). */
export function ai() {
  if (!client) {
    client = new GoogleGenAI({
      vertexai: true,
      project: process.env.GCP_PROJECT ?? 'learners-hub-app',
      location: process.env.GCP_LOCATION ?? 'europe-west1',
    });
  }
  return client;
}

export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

/** Structured JSON output against a response schema. */
export async function generateJson<T>(prompt: string | any[], schema: Schema, opts: { model?: string; temperature?: number } = {}): Promise<T> {
  const contents = typeof prompt === 'string' ? prompt : [{ role: 'user', parts: prompt }];
  const res = await ai().models.generateContent({
    model: opts.model ?? MODEL,
    contents,
    config: { responseMimeType: 'application/json', responseSchema: schema, temperature: opts.temperature ?? 0.3 },
  });
  return JSON.parse(res.text ?? 'null') as T;
}

/**
 * Google Search grounding cannot be combined with a response schema, so the
 * model is asked for a JSON array in plain text and we parse it leniently.
 */
export async function searchGroundedJson<T>(prompt: string): Promise<T[]> {
  const res = await ai().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
  });
  const text = res.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

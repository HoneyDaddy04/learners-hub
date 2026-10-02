import { generateJson, Type } from './ai.js';

export interface QuizQuestion { prompt: string; options: string[]; correctIndex: number }

interface ModuleForQuiz {
  title: string;
  summary: string;
  items: { source: string; url: string; title: string; durationSec?: number }[];
}

export const PASS_MARK = 2; // of 3

export function validQuestions(qs: QuizQuestion[]): QuizQuestion[] {
  return qs
    .filter((q) => q.prompt?.trim() && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => o?.trim()))
    .filter((q) => Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4)
    .slice(0, 3);
}

export function grade(questions: { correctIndex: number }[], answers: number[]) {
  const score = questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
  return { score, passed: score >= Math.min(PASS_MARK, questions.length) };
}

/**
 * Three multiple-choice questions for a module. Gemini watches the first
 * YouTube item (first 20 minutes, low resolution to keep cost down) and reads
 * the other titles; questions must be answerable from the material.
 */
export async function generateQuiz(pathTitle: string, m: ModuleForQuiz): Promise<QuizQuestion[]> {
  const video = m.items.find((i) => i.source === 'youtube');
  const parts: any[] = [];
  if (video) {
    parts.push({ fileData: { fileUri: video.url, mimeType: 'video/mp4' }, videoMetadata: { endOffset: '1200s', fps: 0.2 } });
  }
  parts.push({
    text: `Write exactly 3 multiple-choice questions that check an employee understood this module.
Path: ${pathTitle}
Module: ${m.title} - ${m.summary}
Materials: ${m.items.map((i) => i.title).join('; ')}
${video ? 'Base at least two questions on what the attached video actually teaches.' : ''}
Each question: practical, workplace-relevant, one clearly correct answer, 4 short options, no "all of the above".`,
  });
  const out = await generateJson<{ questions: QuizQuestion[] }>(parts, {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        minItems: '3',
        maxItems: '3',
        items: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: '4', maxItems: '4' },
            correctIndex: { type: Type.INTEGER },
          },
          required: ['prompt', 'options', 'correctIndex'],
        },
      },
    },
    required: ['questions'],
  });
  return validQuestions(out?.questions ?? []);
}

import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../lib/http-error.js';

const questionSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(1000),
});

const questionsSchema = z.object({ questions: z.array(questionSchema).min(3).max(20) });

export type DraftQuestion = z.infer<typeof questionSchema>;

export async function generateQuestions(input: {
  courseTitle: string;
  lessonTitle: string;
  lessonContent: string;
  resourceText: string;
  questionCount: number;
}): Promise<DraftQuestion[]> {
  if (!config.learning.deepSeekApiKey) {
    throw new HttpError(503, 'AI_NOT_CONFIGURED', 'Add DEEPSEEK_API_KEY to the server environment to draft exam questions.');
  }

  const material = [input.lessonContent, input.resourceText]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 48_000);
  if (material.trim().length < 100) {
    throw HttpError.badRequest('Add lesson notes or upload a text-based resource with at least 100 characters.');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.learning.deepSeekApiKey}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: config.learning.deepSeekModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Write fair educational multiple-choice exam questions using only the supplied lesson material. ' +
            'Return valid JSON shaped as {"questions":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}. ' +
            'Each question must have exactly four distinct options, one unambiguous correct answer, and a concise explanation. ' +
            'Do not include markdown or facts not supported by the material.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            course: input.courseTitle,
            lesson: input.lessonTitle,
            questionCount: input.questionCount,
            material,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, 'AI_PROVIDER_ERROR', `DeepSeek could not draft questions (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, 'AI_RESPONSE_INVALID', 'DeepSeek returned an empty question draft.');

  try {
    const parsed = questionsSchema.parse(JSON.parse(content));
    if (parsed.questions.length !== input.questionCount) {
      throw new Error('Question count did not match the request.');
    }
    return parsed.questions;
  } catch {
    throw new HttpError(502, 'AI_RESPONSE_INVALID', 'DeepSeek returned questions in an unsupported format. Try again.');
  }
}
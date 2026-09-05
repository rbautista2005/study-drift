import { env } from 'cloudflare:workers';
import {
  createStudySetFromGenerated,
  GeneratedStudyGuideError,
  generatedStudyGuideSchema,
} from '@/lib/ai-study-guide';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const fileTypes: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
};

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
};

class GenerateRouteError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function fileExtension(name: string) {
  return name.toLowerCase().split('.').pop() ?? '';
}

function cleanField(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim() || fallback;
}

function fileToDataUrl(file: File, mimeType: string) {
  return file.arrayBuffer().then((buffer) => {
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  });
}

function readOutputText(response: OpenAIResponse) {
  for (const output of response.output ?? []) {
    if (output.type !== 'message') continue;
    for (const content of output.content ?? []) {
      if (content.type === 'refusal' && content.refusal) {
        throw new GenerateRouteError(
          'This file could not be converted into study questions.',
          422,
        );
      }
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new GenerateRouteError(
    'The model did not return a complete study guide. Try a clearer file.',
    502,
  );
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_BYTES + 256 * 1024) {
      throw new GenerateRouteError('Choose a file smaller than 8 MB.', 413);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new GenerateRouteError('Choose a study guide to scan.');
    }
    if (file.size === 0) {
      throw new GenerateRouteError('That file is empty.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new GenerateRouteError('Choose a file smaller than 8 MB.', 413);
    }

    const extension = fileExtension(file.name);
    const mimeType = fileTypes[extension];
    if (!mimeType) {
      throw new GenerateRouteError(
        'Use a PDF, Word document, JPG, PNG, TXT, or Markdown file.',
      );
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new GenerateRouteError(
        'AI imports need an OpenAI API key on the server.',
        503,
      );
    }

    const requestedTitle = cleanField(formData.get('title'), 'Imported guide');
    const requestedCourse = cleanField(formData.get('course'), 'Study set');
    if (requestedTitle.length > 60 || requestedCourse.length > 30) {
      throw new GenerateRouteError('Shorten the title or course label.');
    }

    const dataUrl = await fileToDataUrl(file, mimeType);
    const isImage = mimeType.startsWith('image/');
    const fileInput = isImage
      ? { type: 'input_image', image_url: dataUrl, detail: 'high' }
      : {
          type: 'input_file',
          filename: file.name,
          file_data: dataUrl,
          ...(extension === 'pdf' ? { detail: 'high' } : {}),
        };

    const openAIResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-terra',
        store: false,
        instructions: [
          'You create accurate multiple-choice study questions from an uploaded study guide.',
          'Use only information supported by the source. Never add outside facts.',
          'Find 4–12 distinct, important concepts based on the amount of useful material.',
          'Create two meaningfully different questions per concept so a recovery lap tests understanding instead of memorization.',
          'Make distractors plausible but unambiguously incorrect according to the source.',
          'Vary difficulty from 1 (recall) to 3 (application). Keep every answer concise.',
          'Group each concept under a short topic and explain why each correct answer is right.',
        ].join(' '),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Build a Study Drift set. Preferred title: ${requestedTitle}. Course label: ${requestedCourse}.`,
              },
              fileInput,
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'study_drift_guide',
            strict: true,
            schema: generatedStudyGuideSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(75_000),
    });

    const responseBody = (await openAIResponse.json()) as OpenAIResponse;
    if (!openAIResponse.ok) {
      const message =
        openAIResponse.status === 401
          ? 'The server API key is not valid.'
          : openAIResponse.status === 429
            ? 'The AI pit crew is busy. Wait a moment and try again.'
            : 'The AI model could not process that file.';
      throw new GenerateRouteError(message, openAIResponse.status);
    }

    const generated = JSON.parse(readOutputText(responseBody)) as unknown;
    const studySet = createStudySetFromGenerated(
      generated,
      requestedTitle,
      requestedCourse,
    );
    return json({ studySet });
  } catch (error) {
    if (error instanceof GenerateRouteError) {
      return json({ error: error.message }, error.status);
    }
    if (error instanceof GeneratedStudyGuideError) {
      return json({ error: error.message }, 422);
    }
    if (error instanceof SyntaxError) {
      return json(
        { error: 'The model returned an unreadable study guide. Try again.' },
        502,
      );
    }
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return json(
        { error: 'The scan took too long. Try a smaller or clearer file.' },
        504,
      );
    }
    return json({ error: 'The study guide could not be generated.' }, 500);
  }
}

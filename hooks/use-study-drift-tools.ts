'use client';

import { useEffect, useRef } from 'react';
import type { StudyQuestion } from '@/lib/study-data';

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  execute(input: unknown): unknown;
};

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool(
        tool: ToolDefinition,
        options?: { signal?: AbortSignal },
      ): void | Promise<void>;
    };
  }
}

type StudyDriftToolState = {
  screen: 'garage' | 'race' | 'report' | 'multiplayer';
  currentQuestion: StudyQuestion | undefined;
  questionIndex: number;
  questionCount: number;
  selectedIndex: number | null;
  correctCount: number;
  score: number;
  onStartSolo: () => void;
  onAnswer: (index: number) => void;
  onAdvance: () => void;
};

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function objectInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Input must be an object.');
  }
  return input as Record<string, unknown>;
}

export function useStudyDriftTools(state: StudyDriftToolState) {
  const latest = useRef(state);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const register = (tool: ToolDefinition) => {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {
        // WebMCP is progressive enhancement; the visible UI remains authoritative.
      });
    };

    register({
      name: 'start_solo_race',
      title: 'Start solo race',
      description:
        'Start or reset the bundled Study Drift solo race and show its first question.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        objectInput(input);
        latest.current.onStartSolo();
        await nextPaint();
        return {
          status: 'race_started',
          questionCount: latest.current.questionCount,
        };
      },
    });

    register({
      name: 'submit_solo_answer',
      title: 'Submit solo answer',
      description:
        'Answer the currently visible solo-race question using a one-based choice number from 1 to 4.',
      inputSchema: {
        type: 'object',
        properties: {
          choiceNumber: { type: 'integer', minimum: 1, maximum: 4 },
        },
        required: ['choiceNumber'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const values = objectInput(input);
        const choiceNumber = values.choiceNumber;
        const snapshot = latest.current;

        if (snapshot.screen !== 'race' || !snapshot.currentQuestion) {
          throw new Error('No solo race question is active.');
        }
        if (snapshot.selectedIndex !== null) {
          throw new Error('The current question has already been answered.');
        }
        if (
          !Number.isInteger(choiceNumber) ||
          Number(choiceNumber) < 1 ||
          Number(choiceNumber) > 4
        ) {
          throw new Error('choiceNumber must be an integer from 1 to 4.');
        }

        const answerIndex = Number(choiceNumber) - 1;
        const correct = answerIndex === snapshot.currentQuestion.answerIndex;
        snapshot.onAnswer(answerIndex);
        await nextPaint();
        return {
          accepted: true,
          correct,
          explanation: snapshot.currentQuestion.explanation,
        };
      },
    });

    register({
      name: 'continue_solo_race',
      title: 'Continue solo race',
      description:
        'Move from answer feedback to the next question or the final pit report.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        objectInput(input);
        if (
          latest.current.screen !== 'race' ||
          latest.current.selectedIndex === null
        ) {
          throw new Error('Answer the current question before continuing.');
        }
        latest.current.onAdvance();
        await nextPaint();
        return {
          status: latest.current.screen,
          questionNumber:
            latest.current.screen === 'race'
              ? latest.current.questionIndex + 1
              : null,
        };
      },
    });

    register({
      name: 'read_solo_race_status',
      title: 'Read solo race status',
      description:
        'Read the visible solo-race screen, question progress, correct count, and score without changing anything.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        objectInput(input);
        const snapshot = latest.current;
        return {
          screen: snapshot.screen,
          questionNumber:
            snapshot.screen === 'race' ? snapshot.questionIndex + 1 : null,
          questionCount: snapshot.questionCount,
          correctCount: snapshot.correctCount,
          score: snapshot.score,
        };
      },
    });

    return () => lifecycle.abort();
  }, []);
}

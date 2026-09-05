'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleGauge,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { RaceTrack } from '@/components/race-track';
import { Button } from '@/components/ui/button';
import { buildLap, biologyDemo, type StudyQuestion } from '@/lib/study-data';
import {
  difficultyLabel,
  masteryTarget,
  pointsForAnswer,
  speedForAnswer,
  topicSummary,
  type AnswerRecord,
} from '@/lib/race-engine';

type Screen = 'garage' | 'race' | 'report';

const choiceKeys = ['1', '2', '3', '4'];

export function StudyDriftApp() {
  const [screen, setScreen] = useState<Screen>('garage');
  const [lap, setLap] = useState(0);
  const [questions, setQuestions] = useState<StudyQuestion[]>(() =>
    buildLap(biologyDemo, 0),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [boost, setBoost] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const currentQuestion = questions[questionIndex];
  const target = masteryTarget(questions.length);
  const correctCount = records.filter((record) => record.correct).length;
  const answeredCount = records.length;
  const progress =
    screen === 'report' && correctCount >= target
      ? 100
      : Math.min(96, (answeredCount / questions.length) * 100);
  const isAnswered = selectedIndex !== null;

  const resetRace = useCallback((nextLap: number) => {
    setQuestions(buildLap(biologyDemo, nextLap));
    setQuestionIndex(0);
    setSelectedIndex(null);
    setRecords([]);
    setScore(0);
    setStreak(0);
    setSpeed(0);
    setBoost(false);
    setLap(nextLap);
    setScreen('race');
  }, []);

  const submitAnswer = useCallback(
    (answerIndex: number) => {
      if (!currentQuestion || selectedIndex !== null) return;

      const correct = answerIndex === currentQuestion.answerIndex;
      const nextStreak = correct ? streak + 1 : 0;
      const earnedPoints = correct
        ? pointsForAnswer(currentQuestion.difficulty, nextStreak)
        : 0;

      setSelectedIndex(answerIndex);
      setStreak(nextStreak);
      setScore((current) => current + earnedPoints);
      setSpeed(
        correct ? speedForAnswer(currentQuestion.difficulty, nextStreak) : 34,
      );
      setBoost(correct);
      setRecords((current) => [
        ...current,
        {
          question: currentQuestion,
          selectedIndex: answerIndex,
          correct,
          earnedPoints,
          streakAfter: nextStreak,
        },
      ]);
    },
    [currentQuestion, selectedIndex, streak],
  );

  const advance = useCallback(() => {
    if (selectedIndex === null) return;
    setBoost(false);

    if (questionIndex >= questions.length - 1) {
      setScreen('report');
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedIndex(null);
  }, [questionIndex, questions.length, selectedIndex]);

  useEffect(() => {
    if (isAnswered) nextButtonRef.current?.focus();
  }, [isAnswered]);

  useEffect(() => {
    if (screen !== 'race') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key >= '1' && event.key <= '4' && selectedIndex === null) {
        submitAnswer(Number(event.key) - 1);
      }
      if (event.key === 'Enter' && selectedIndex !== null) advance();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, screen, selectedIndex, submitAnswer]);

  return (
    <main className="app-shell">
      <AppHeader screen={screen} onHome={() => setScreen('garage')} />
      {screen === 'garage' && <Garage onStart={() => resetRace(0)} />}
      {screen === 'race' && currentQuestion && (
        <RaceScreen
          answeredCount={answeredCount}
          boost={boost}
          currentQuestion={currentQuestion}
          onAdvance={advance}
          onAnswer={submitAnswer}
          progress={progress}
          questionCount={questions.length}
          questionIndex={questionIndex}
          score={score}
          selectedIndex={selectedIndex}
          speed={speed}
          streak={streak}
          nextButtonRef={nextButtonRef}
        />
      )}
      {screen === 'report' && (
        <PitReport
          lap={lap}
          records={records}
          score={score}
          target={target}
          onRetry={() => resetRace(lap + 1)}
          onGarage={() => setScreen('garage')}
        />
      )}
    </main>
  );
}

function AppHeader({ screen, onHome }: { screen: Screen; onHome: () => void }) {
  return (
    <header className="app-header">
      <button
        className="brand"
        type="button"
        onClick={onHome}
        aria-label="Study Drift home"
      >
        <span className="brand__mark" aria-hidden="true">
          <span />
        </span>
        <span>Study Drift</span>
      </button>
      <div className="header-status" aria-label="Current location">
        <span className={screen === 'garage' ? 'is-active' : ''}>Garage</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span className={screen === 'race' ? 'is-active' : ''}>Race</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span className={screen === 'report' ? 'is-active' : ''}>
          Pit report
        </span>
      </div>
      <div className="header-chip">
        <Flame size={15} aria-hidden="true" /> Demo streak <strong>3</strong>
      </div>
    </header>
  );
}

function Garage({ onStart }: { onStart: () => void }) {
  return (
    <div className="garage-layout">
      <section className="garage-main">
        <div className="eyebrow">
          <span /> Your next study session
        </div>
        <h1>
          Learn the course.
          <br />
          Race the clock.
        </h1>
        <p className="lede">
          Every correct answer creates momentum. Every lap shows exactly what to
          review next.
        </p>

        <div className="mode-switch" role="tablist" aria-label="Race mode">
          <button
            className="is-selected"
            role="tab"
            aria-selected="true"
            type="button"
          >
            <CircleGauge size={18} aria-hidden="true" /> Solo race
          </button>
          <button role="tab" aria-selected="false" type="button" disabled>
            <Users size={18} aria-hidden="true" /> Multiplayer{' '}
            <span>Next build</span>
          </button>
        </div>

        <article className="study-set-card">
          <div className="study-set-card__top">
            <div className="set-icon">
              <BookOpen size={22} aria-hidden="true" />
            </div>
            <div>
              <span className="telemetry-label">Selected study set</span>
              <h2>{biologyDemo.title}</h2>
              <p>
                {biologyDemo.course} · {biologyDemo.description}
              </p>
            </div>
            <span className="ready-badge">
              <Check size={14} aria-hidden="true" /> Demo ready
            </span>
          </div>
          <div className="study-set-card__stats">
            <div>
              <strong>5</strong>
              <span>concepts</span>
            </div>
            <div>
              <strong>80%</strong>
              <span>finish line</span>
            </div>
            <div>
              <strong>2×</strong>
              <span>question variants</span>
            </div>
          </div>
          <div className="study-set-card__action">
            <p>
              <Sparkles size={16} aria-hidden="true" /> A recovery lap swaps in
              matched questions—not repeats.
            </p>
            <Button className="start-button" size="lg" onClick={onStart}>
              Start race <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </article>
      </section>

      <aside className="garage-aside">
        <div className="track-preview" aria-hidden="true">
          <div className="track-preview__route">
            <span className="track-preview__dot track-preview__dot--start" />
            <span className="track-preview__dot track-preview__dot--one" />
            <span className="track-preview__dot track-preview__dot--two" />
            <span className="track-preview__dot track-preview__dot--finish" />
          </div>
          <div className="track-preview__legend">
            <span>Start</span>
            <span>Glycolysis</span>
            <span>Cycle</span>
            <span>ETC</span>
          </div>
        </div>
        <div className="briefing-card">
          <span className="telemetry-label">Race briefing · 02:30</span>
          <h2>Five concepts. One clean lap.</h2>
          <p>
            Harder questions trigger a stronger boost, but accuracy gets you
            across the line.
          </p>
          <ul>
            <li>
              <span>1–4</span> Choose an answer
            </li>
            <li>
              <span>↵</span> Continue
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

type RaceScreenProps = {
  answeredCount: number;
  boost: boolean;
  currentQuestion: StudyQuestion;
  onAdvance: () => void;
  onAnswer: (index: number) => void;
  progress: number;
  questionCount: number;
  questionIndex: number;
  score: number;
  selectedIndex: number | null;
  speed: number;
  streak: number;
  nextButtonRef: React.RefObject<HTMLButtonElement | null>;
};

function RaceScreen(props: RaceScreenProps) {
  const {
    answeredCount,
    boost,
    currentQuestion,
    onAdvance,
    onAnswer,
    progress,
    questionCount,
    questionIndex,
    score,
    selectedIndex,
    speed,
    streak,
    nextButtonRef,
  } = props;
  const answered = selectedIndex !== null;
  const isCorrect = answered && selectedIndex === currentQuestion.answerIndex;

  return (
    <div className="race-layout">
      <div className="race-telemetry">
        <div>
          <span className="telemetry-label">Lap</span>
          <strong>01 / 01</strong>
        </div>
        <div>
          <span className="telemetry-label">Answered</span>
          <strong>
            {answeredCount} / {questionCount}
          </strong>
        </div>
        <div>
          <span className="telemetry-label">Score</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div>
          <span className="telemetry-label">Streak</span>
          <strong className={streak > 1 ? 'hot' : ''}>{streak}×</strong>
        </div>
      </div>

      <RaceTrack progress={progress} speed={speed} boost={boost} />

      <section className="question-panel" aria-labelledby="question-heading">
        <div className="question-panel__meta">
          <span>
            Question {questionIndex + 1} of {questionCount}
          </span>
          <span
            className={`difficulty difficulty--${currentQuestion.difficulty}`}
          >
            <Zap size={13} aria-hidden="true" />{' '}
            {difficultyLabel[currentQuestion.difficulty]} ·{' '}
            {currentQuestion.difficulty}× boost
          </span>
          <span>{currentQuestion.topic}</span>
        </div>
        <h1 id="question-heading">{currentQuestion.prompt}</h1>
        <div className="answer-grid" role="group" aria-label="Answer choices">
          {currentQuestion.choices.map((choice, index) => {
            const isAnswer = index === currentQuestion.answerIndex;
            const wasSelected = index === selectedIndex;
            let stateClass = '';
            if (answered && isAnswer) stateClass = ' answer--correct';
            if (answered && wasSelected && !isAnswer)
              stateClass = ' answer--wrong';

            return (
              <button
                className={`answer${stateClass}`}
                disabled={answered}
                key={choice}
                onClick={() => onAnswer(index)}
                type="button"
              >
                <span className="answer__key">{choiceKeys[index]}</span>
                <span>{choice}</span>
                {answered && isAnswer && (
                  <Check
                    className="answer__state"
                    size={18}
                    aria-label="Correct answer"
                  />
                )}
                {answered && wasSelected && !isAnswer && (
                  <X
                    className="answer__state"
                    size={18}
                    aria-label="Your incorrect answer"
                  />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`feedback${isCorrect ? ' feedback--correct' : ' feedback--wrong'}`}
            role="status"
          >
            <div>
              <span className="feedback__title">
                {isCorrect ? (
                  <>
                    <Check size={18} aria-hidden="true" /> Clean line
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} aria-hidden="true" /> Pit check
                  </>
                )}
              </span>
              <p>{currentQuestion.explanation}</p>
            </div>
            <Button
              ref={nextButtonRef}
              className="continue-button"
              onClick={onAdvance}
            >
              {questionIndex === questionCount - 1
                ? 'See pit report'
                : 'Next turn'}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function PitReport({
  lap,
  records,
  score,
  target,
  onRetry,
  onGarage,
}: {
  lap: number;
  records: AnswerRecord[];
  score: number;
  target: number;
  onRetry: () => void;
  onGarage: () => void;
}) {
  const correct = records.filter((record) => record.correct).length;
  const accuracy = Math.round((correct / records.length) * 100);
  const passed = correct >= target;
  const topics = useMemo(() => topicSummary(records), [records]);
  const weakest = topics[0];

  return (
    <div className="report-layout">
      <section className="report-hero">
        <div
          className={`finish-emblem${passed ? ' finish-emblem--passed' : ''}`}
        >
          {passed ? (
            <Trophy size={32} aria-hidden="true" />
          ) : (
            <CircleGauge size={32} aria-hidden="true" />
          )}
        </div>
        <span className="eyebrow">
          <span /> Pit report · Lap {String(lap + 1).padStart(2, '0')}
        </span>
        <h1>{passed ? 'Finish line crossed.' : 'One more lap.'}</h1>
        <p>
          {passed
            ? `You cleared the ${target}-answer mastery line. Now tighten the sector that cost you the most time.`
            : `You landed ${correct} correct answers. The next lap keeps the same concepts and difficulty mix with new wording.`}
        </p>
        <div className="report-scoreboard">
          <div>
            <span>Accuracy</span>
            <strong>{accuracy}%</strong>
          </div>
          <div>
            <span>Correct</span>
            <strong>
              {correct}/{records.length}
            </strong>
          </div>
          <div>
            <span>Race score</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
        </div>
        <div className="report-actions">
          <Button className="start-button" size="lg" onClick={onRetry}>
            {passed ? 'Practice weakest sector' : 'Run recovery lap'}{' '}
            <RotateCcw size={17} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="lg" onClick={onGarage}>
            Back to garage
          </Button>
        </div>
      </section>

      <aside className="sector-report">
        <div className="sector-report__header">
          <div>
            <span className="telemetry-label">Concept telemetry</span>
            <h2>Sector breakdown</h2>
          </div>
          <span className="weakest-chip">Review: {weakest?.topic}</span>
        </div>
        <div className="sector-list">
          {topics.map((topic, index) => (
            <div className="sector-row" key={topic.topic}>
              <span className="sector-row__number">0{index + 1}</span>
              <div>
                <div className="sector-row__label">
                  <strong>{topic.topic}</strong>
                  <span>
                    {topic.correct}/{topic.total}
                  </span>
                </div>
                <div
                  className="sector-row__bar"
                  aria-label={`${topic.topic}: ${topic.accuracy}%`}
                >
                  <span style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
              <strong>{topic.accuracy}%</strong>
            </div>
          ))}
        </div>
        <div className="insight-card">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <strong>Next best move</strong>
            <p>
              Start with {weakest?.topic ?? 'your lowest-scoring topic'}. The
              recovery lap swaps in an unseen matched variant, so improvement
              means learning—not memorizing.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleGauge,
  Coins,
  ExternalLink,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { MultiplayerGarage } from "@/components/multiplayer-garage";
import { MultiplayerRoom } from "@/components/multiplayer-room";
import { RaceTrack } from "@/components/race-track";
import { StudyGuideImporter } from "@/components/study-guide-importer";
import { Button } from "@/components/ui/button";
import { useStudyDriftTools } from "@/hooks/use-study-drift-tools";
import {
  clearMultiplayerSession,
  leaveMultiplayerRoom,
  readMultiplayerRoom,
  restoreMultiplayerSession,
} from "@/lib/multiplayer-client";
import type {
  MultiplayerRoom as MultiplayerRoomState,
  MultiplayerSession,
} from "@/lib/multiplayer-types";
import {
  emptyPlayerProgress,
  finishSoloRace,
  loadPlayerProgress,
  savePlayerProgress,
  type PlayerProgress,
  type RaceReward,
} from "@/lib/player-progress";
import {
  buildLap,
  biologyDemo,
  type StudyQuestion,
  type StudySet,
} from "@/lib/study-data";
import {
  difficultyLabel,
  pointsForAnswer,
  speedForAnswer,
  topicSummary,
  type AnswerRecord,
} from "@/lib/race-engine";

type Screen = "garage" | "race" | "report" | "multiplayer";
type GarageMode = "solo" | "multiplayer";

const choiceKeys = ["1", "2", "3", "4"];

function learningResources(topic: string) {
  const query = encodeURIComponent(topic);
  return [
    {
      label: "Lesson search",
      provider: "Khan Academy",
      url: `https://www.khanacademy.org/search?page_search_query=${query}`,
    },
    {
      label: "Video search",
      provider: "YouTube",
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
  ];
}

export function StudyDriftApp() {
  const [screen, setScreen] = useState<Screen>("garage");
  const [garageMode, setGarageMode] = useState<GarageMode>("solo");
  const [multiplayer, setMultiplayer] = useState<{
    session: MultiplayerSession;
    room: MultiplayerRoomState;
  } | null>(null);
  const [lap, setLap] = useState(0);
  const [studySet, setStudySet] = useState<StudySet>(biologyDemo);
  const [questions, setQuestions] = useState<StudyQuestion[]>(() =>
    buildLap(biologyDemo, 0),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [playerProgress, setPlayerProgress] =
    useState<PlayerProgress>(emptyPlayerProgress);
  const [lastReward, setLastReward] = useState<RaceReward | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const raceCompletionRef = useRef(false);

  const currentQuestion = questions[questionIndex];
  const correctCount = records.filter((record) => record.correct).length;
  const answeredCount = records.length;
  const progress =
    screen === "report"
      ? 100
      : Math.min(96, (answeredCount / questions.length) * 100);
  const isAnswered = selectedIndex !== null;
  const boost = streak > 0;

  const resetRace = useCallback(
    (nextLap: number) => {
      setQuestions(buildLap(studySet, nextLap));
      setQuestionIndex(0);
      setSelectedIndex(null);
      setRecords([]);
      setScore(0);
      setStreak(0);
      setSpeed(0);
      setLastReward(null);
      raceCompletionRef.current = false;
      setLap(nextLap);
      setScreen("race");
    },
    [studySet],
  );

  const importSet = useCallback((nextStudySet: StudySet) => {
    setStudySet(nextStudySet);
    setQuestions(buildLap(nextStudySet, 0));
    setQuestionIndex(0);
    setSelectedIndex(null);
    setRecords([]);
    setScore(0);
    setStreak(0);
    setSpeed(0);
    setLastReward(null);
    raceCompletionRef.current = false;
    setLap(0);
  }, []);

  const exitMultiplayer = useCallback(() => {
    if (multiplayer) {
      void leaveMultiplayerRoom(multiplayer.session).catch(() => undefined);
    }
    clearMultiplayerSession();
    setMultiplayer(null);
    setGarageMode("multiplayer");
    setScreen("garage");
  }, [multiplayer]);

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

    if (questionIndex >= questions.length - 1) {
      if (raceCompletionRef.current) return;
      raceCompletionRef.current = true;
      const raceResult = finishSoloRace(playerProgress, {
        correctCount,
        longestStreak: records.reduce(
          (longest, record) => Math.max(longest, record.streakAfter),
          0,
        ),
        score,
      });
      setPlayerProgress(raceResult.progress);
      setLastReward(raceResult.reward);
      savePlayerProgress(raceResult.progress);
      setScreen("report");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedIndex(null);
  }, [
    correctCount,
    playerProgress,
    questionIndex,
    questions.length,
    records,
    score,
    selectedIndex,
  ]);

  useEffect(() => {
    if (isAnswered) nextButtonRef.current?.focus();
  }, [isAnswered]);

  useEffect(() => {
    if (screen !== "race") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key >= "1" && event.key <= "4" && selectedIndex === null) {
        submitAnswer(Number(event.key) - 1);
      }
      if (event.key === "Enter" && selectedIndex !== null) advance();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, screen, selectedIndex, submitAnswer]);

  useEffect(() => {
    const timer = setTimeout(() => setPlayerProgress(loadPlayerProgress()), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const session = restoreMultiplayerSession();
    if (!session) return;

    let cancelled = false;
    void readMultiplayerRoom(session)
      .then((response) => {
        if (cancelled) return;
        setMultiplayer({ session, room: response.room });
        setScreen("multiplayer");
      })
      .catch(() => clearMultiplayerSession());

    return () => {
      cancelled = true;
    };
  }, []);

  useStudyDriftTools({
    screen,
    currentQuestion,
    questionIndex,
    questionCount: questions.length,
    selectedIndex,
    correctCount,
    score,
    onStartSolo: () => resetRace(0),
    onAnswer: submitAnswer,
    onAdvance: advance,
  });

  return (
    <main className="app-shell">
      <AppHeader
        playerProgress={playerProgress}
        screen={screen}
        onHome={
          screen === "multiplayer" ? exitMultiplayer : () => setScreen("garage")
        }
      />
      {screen === "garage" && (
        <Garage
          mode={garageMode}
          onMode={setGarageMode}
          onStart={() => resetRace(0)}
          onImport={importSet}
          studySet={studySet}
          onMultiplayerConnected={(session, room) => {
            setMultiplayer({ session, room });
            setScreen("multiplayer");
          }}
        />
      )}
      {screen === "race" && currentQuestion && (
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
      {screen === "report" && (
        <PitReport
          lap={lap}
          lastReward={lastReward}
          playerProgress={playerProgress}
          records={records}
          score={score}
          onRetry={() => resetRace(lap + 1)}
          onGarage={() => setScreen("garage")}
        />
      )}
      {screen === "multiplayer" && multiplayer && (
        <MultiplayerRoom
          initialRoom={multiplayer.room}
          session={multiplayer.session}
          onExit={exitMultiplayer}
        />
      )}
    </main>
  );
}

function AppHeader({
  playerProgress,
  screen,
  onHome,
}: {
  playerProgress: PlayerProgress;
  screen: Screen;
  onHome: () => void;
}) {
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
        <span className={screen === "garage" ? "is-active" : ""}>Garage</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span
          className={
            screen === "race" || screen === "multiplayer" ? "is-active" : ""
          }
        >
          Race
        </span>
        <ChevronRight size={14} aria-hidden="true" />
        <span className={screen === "report" ? "is-active" : ""}>
          Pit report
        </span>
      </div>
      <div
        className="header-chip"
        aria-label={`${playerProgress.longestStreak} best streak, ${playerProgress.tokens} tokens`}
      >
        <Flame size={15} aria-hidden="true" /> Best streak{" "}
        <strong>{playerProgress.longestStreak}</strong>
        <span className="header-chip__divider" />
        <Coins size={15} aria-hidden="true" />
        <strong>{playerProgress.tokens}</strong>
      </div>
    </header>
  );
}

function Garage({
  mode,
  onMode,
  onStart,
  onImport,
  onMultiplayerConnected,
  studySet,
}: {
  mode: GarageMode;
  onMode: (mode: GarageMode) => void;
  onStart: () => void;
  onImport: (studySet: StudySet) => void;
  onMultiplayerConnected: (
    session: MultiplayerSession,
    room: MultiplayerRoomState,
  ) => void;
  studySet: StudySet;
}) {
  const conceptCount = new Set(
    studySet.questions.map((question) => question.conceptId),
  ).size;
  const imported = studySet.id !== biologyDemo.id;

  return (
    <div className="garage-layout">
      <section className="garage-main">
        <div className="eyebrow">
          <span /> Your next study session
        </div>
        <h1>
          {mode === "solo" ? (
            <>
              Learn the course.
              <br />
              Race the clock.
            </>
          ) : (
            <>
              Same questions.
              <br />
              Real competition.
            </>
          )}
        </h1>
        <p className="lede">
          {mode === "solo"
            ? "Every correct answer creates momentum. Every lap shows exactly what to review next."
            : "Create a room, share the code, and race friends through one fair, frozen study set."}
        </p>

        <div className="mode-switch" role="tablist" aria-label="Race mode">
          <button
            className={mode === "solo" ? "is-selected" : ""}
            role="tab"
            aria-selected={mode === "solo"}
            onClick={() => onMode("solo")}
            type="button"
          >
            <CircleGauge size={18} aria-hidden="true" /> Solo race
          </button>
          <button
            className={mode === "multiplayer" ? "is-selected" : ""}
            role="tab"
            aria-selected={mode === "multiplayer"}
            onClick={() => onMode("multiplayer")}
            type="button"
          >
            <Users size={18} aria-hidden="true" /> Multiplayer <span>Live</span>
          </button>
        </div>

        {mode === "solo" ? (
          <article className="study-set-card">
            <div className="study-set-card__top">
              <div className="set-icon">
                <BookOpen size={22} aria-hidden="true" />
              </div>
              <div>
                <span className="telemetry-label">Selected study set</span>
                <h2>{studySet.title}</h2>
                <p>
                  {studySet.course} · {studySet.description}
                </p>
              </div>
              <span className="ready-badge">
                <Check size={14} aria-hidden="true" />
                {imported ? "Imported" : "Demo ready"}
              </span>
            </div>
            <div className="study-set-card__stats">
              <div>
                <strong>{conceptCount}</strong>
                <span>concepts</span>
              </div>
              <div>
                <strong>{conceptCount}</strong>
                <span>questions per lap</span>
              </div>
              <div>
                <strong>2×</strong>
                <span>question variants</span>
              </div>
            </div>
            <div className="study-set-card__action">
              <p>
                <Sparkles size={16} aria-hidden="true" /> A recovery lap swaps
                in matched questions—not repeats.
              </p>
              <div className="study-set-card__buttons">
                <StudyGuideImporter onImport={onImport} />
                <Button className="start-button" size="lg" onClick={onStart}>
                  Start race <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </article>
        ) : (
          <MultiplayerGarage
            onConnected={onMultiplayerConnected}
            onImport={onImport}
            studySet={studySet}
          />
        )}
      </section>

      <aside className="garage-aside">
        <div
          className="track-preview"
          data-course={`COURSE / ${studySet.course}`}
          aria-hidden="true"
        >
          <div className="track-preview__scene">
            <div className="track-preview__speed-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="track-preview__road">
              <span className="track-preview__lane track-preview__lane--one" />
              <span className="track-preview__lane track-preview__lane--two" />
              <span className="track-preview__start-grid" />
              <div className="track-preview__car-runner">
                <div className="track-preview__car">
                  <span className="track-preview__spoiler" />
                  <span className="track-preview__car-body" />
                  <span className="track-preview__car-window" />
                  <span className="track-preview__wheel track-preview__wheel--rear" />
                  <span className="track-preview__wheel track-preview__wheel--front" />
                </div>
              </div>
              <span className="track-preview__finish-line" />
            </div>
            <div className="track-preview__finish-post">
              <span>Finish</span>
            </div>
          </div>
          <div className="track-preview__legend">
            <span>Start grid</span>
            <span>Finish</span>
          </div>
        </div>
        <div className="briefing-card">
          <span className="telemetry-label">
            Race briefing · {conceptCount} turns
          </span>
          <h2>{conceptCount} concepts. One clean lap.</h2>
          <p>
            Harder questions trigger a stronger boost. Your final accuracy shows
            which sector to practice next.
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
          <strong className={streak > 1 ? "hot" : ""}>{streak}×</strong>
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
            <Zap size={13} aria-hidden="true" />{" "}
            {difficultyLabel[currentQuestion.difficulty]} ·{" "}
            {currentQuestion.difficulty}× boost
          </span>
          <span>{currentQuestion.topic}</span>
        </div>
        <h1 id="question-heading">{currentQuestion.prompt}</h1>
        <fieldset className="answer-grid">
          <legend className="sr-only">Answer choices</legend>
          {currentQuestion.choices.map((choice, index) => {
            const isAnswer = index === currentQuestion.answerIndex;
            const wasSelected = index === selectedIndex;
            let stateClass = "";
            if (answered && isAnswer) stateClass = " answer--correct";
            if (answered && wasSelected && !isAnswer)
              stateClass = " answer--wrong";

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
        </fieldset>

        {answered && (
          <div
            className={`feedback${isCorrect ? " feedback--correct" : " feedback--wrong"}`}
            aria-live="polite"
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
                ? "See pit report"
                : "Next turn"}{" "}
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
  lastReward,
  playerProgress,
  records,
  score,
  onRetry,
  onGarage,
}: {
  lap: number;
  lastReward: RaceReward | null;
  playerProgress: PlayerProgress;
  records: AnswerRecord[];
  score: number;
  onRetry: () => void;
  onGarage: () => void;
}) {
  const correct = records.filter((record) => record.correct).length;
  const accuracy = Math.round((correct / records.length) * 100);
  const topics = useMemo(() => topicSummary(records), [records]);
  const missedTopics = topics.filter((topic) => topic.correct < topic.total);
  const weakest = topics[0];

  return (
    <div className="report-layout">
      <section className="report-hero">
        <div className="finish-emblem finish-emblem--passed">
          <Trophy size={32} aria-hidden="true" />
        </div>
        <span className="eyebrow">
          <span /> Pit report · Lap {String(lap + 1).padStart(2, "0")}
        </span>
        <h1>Lap complete.</h1>
        <p>
          You answered {correct} of {records.length} correctly. Use the sector
          breakdown to decide what to practice next.
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
        {lastReward ? (
          <div className="token-reward" aria-live="polite">
            <Coins size={20} aria-hidden="true" />
            <div>
              <strong>+{lastReward.tokensEarned} drift tokens</strong>
              <span>{playerProgress.tokens} banked</span>
            </div>
          </div>
        ) : null}
        <div className="report-actions">
          <Button className="start-button" size="lg" onClick={onRetry}>
            Practice weakest sector <RotateCcw size={17} aria-hidden="true" />
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
          <span className="weakest-chip">
            {missedTopics.length > 0
              ? `Review: ${weakest?.topic}`
              : "All sectors clear"}
          </span>
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
        <section
          className="learning-resources"
          aria-labelledby="learning-resources-heading"
        >
          <div className="learning-resources__header">
            <div>
              <span className="telemetry-label">Targeted review</span>
              <h3 id="learning-resources-heading">Learning resources</h3>
            </div>
            <span>
              {missedTopics.length}{" "}
              {missedTopics.length === 1 ? "concept" : "concepts"}
            </span>
          </div>
          {missedTopics.length > 0 ? (
            <div className="learning-resource-list">
              {missedTopics.map((topic) => {
                const missedCount = topic.total - topic.correct;
                return (
                  <article className="learning-resource" key={topic.topic}>
                    <div className="learning-resource__topic">
                      <strong>{topic.topic}</strong>
                      <span>
                        {missedCount}{" "}
                        {missedCount === 1 ? "question" : "questions"} missed
                      </span>
                    </div>
                    <div className="learning-resource__links">
                      {learningResources(topic.topic).map((resource) => (
                        <a
                          href={resource.url}
                          key={resource.provider}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span>
                            <small>{resource.provider}</small>
                            {resource.label}
                          </span>
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="learning-resources__empty">
              No missed concepts this lap. Your sector report is clean.
            </p>
          )}
        </section>
        <div className="insight-card">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <strong>Next best move</strong>
            <p>
              Start with {weakest?.topic ?? "your lowest-scoring topic"}. The
              recovery lap swaps in an unseen matched variant, so improvement
              means learning—not memorizing.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

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
  Lock,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { CarLocker } from "@/components/car-locker";
import { QuestionTimer } from "@/components/question-timer";
import { RaceTimerSetting } from "@/components/race-timer-setting";
import { MultiplayerGarage } from "@/components/multiplayer-garage";
import { MultiplayerRoom } from "@/components/multiplayer-room";
import { RaceCarModel } from "@/components/race-car-model";
import { RaceTrack } from "@/components/race-track";
import { StudyGuideImporter } from "@/components/study-guide-importer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { getCar, type CarId, type CarSpec } from "@/lib/car-locker";
import {
  emptyPlayerProgress,
  finishSoloRace,
  loadPlayerProgress,
  redeemCar,
  redeemGuideReview,
  savePlayerProgress,
  selectCar,
  type PlayerProgress,
  type RaceReward,
} from "@/lib/player-progress";
import {
  buildLap,
  guideReviewCost,
  shuffleAnswerChoices,
  studySetGroups,
  studySets,
  type StudyQuestion,
  type StudySet,
} from "@/lib/study-data";
import {
  difficultyLabel,
  speedForAnswer,
  topicSummary,
  type AnswerRecord,
} from "@/lib/race-engine";

type Screen = "garage" | "locker" | "race" | "report" | "multiplayer";
type GarageMode = "solo" | "multiplayer";

const choiceKeys = ["1", "2", "3", "4"];

function sampleRaceQuestions(
  set: StudySet,
  questionCount: number,
  previousIds: Set<string>,
  requiredTopic?: string,
) {
  const pool = [...set.questions];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  const selected = pool.slice(0, questionCount);
  const replaceQuestion = (
    candidates: StudyQuestion[],
    preserveTopic?: string,
    replacePreviousOnly = false,
  ) => {
    const available = candidates.filter(
      (question) => !selected.some((item) => item.id === question.id),
    );
    if (available.length === 0) return;
    const replaceableIndexes = selected
      .map((question, index) => ({ question, index }))
      .filter(
        (item) =>
          item.question.topic !== preserveTopic &&
          (!replacePreviousOnly || previousIds.has(item.question.id)),
      )
      .map((item) => item.index);
    const indexes = replaceableIndexes.length > 0
      ? replaceableIndexes
      : selected.map((_, index) => index);
    const replaceIndex = indexes[Math.floor(Math.random() * indexes.length)];
    selected[replaceIndex] =
      available[Math.floor(Math.random() * available.length)];
  };

  if (
    requiredTopic &&
    !selected.some((question) => question.topic === requiredTopic)
  ) {
    replaceQuestion(
      set.questions.filter((question) => question.topic === requiredTopic),
    );
  }

  const freshCandidates = set.questions.filter(
    (question) => !previousIds.has(question.id),
  );
  const requiredFreshCount = Math.min(
    freshCandidates.length,
    1 + Math.floor(Math.random() * 3),
  );
  while (
    selected.filter((question) => !previousIds.has(question.id)).length <
    requiredFreshCount
  ) {
    const freshCountBefore = selected.filter(
      (question) => !previousIds.has(question.id),
    ).length;
    replaceQuestion(freshCandidates, requiredTopic, true);
    if (
      selected.filter((question) => !previousIds.has(question.id)).length ===
      freshCountBefore
    )
      break;
  }

  return shuffleAnswerChoices(selected);
}

function learningResources(topic: string, studySet: StudySet) {
  const query = encodeURIComponent(
    `${studySet.course} ${studySet.title} ${topic}`,
  );
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
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<number | null>(null);
  const [multiplayer, setMultiplayer] = useState<{
    session: MultiplayerSession;
    room: MultiplayerRoomState;
  } | null>(null);
  const [lap, setLap] = useState(0);
  const [studySet, setStudySet] = useState<StudySet>(studySets[0]);
  const [questions, setQuestions] = useState<StudyQuestion[]>(() =>
    shuffleAnswerChoices(buildLap(studySets[0], 0)),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [playerProgress, setPlayerProgress] =
    useState<PlayerProgress>(emptyPlayerProgress);
  const [lastReward, setLastReward] = useState<RaceReward | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const raceCompletionRef = useRef(false);
  const previousRaceQuestionIdsRef = useRef<Set<string>>(new Set());

  const currentQuestion = questions[questionIndex];
  const correctCount = records.filter((record) => record.correct).length;
  const answeredCount = records.length;
  const progress =
    screen === "report"
      ? 100
      : Math.min(96, (answeredCount / questions.length) * 100);
  const isAnswered = selectedIndex !== null;
  const boost = streak > 0;
  const selectedCar = getCar(playerProgress.selectedCarId);

  const redeemLockerCar = useCallback(
    (car: CarSpec) => {
      const nextProgress = redeemCar(playerProgress, car.id, car.cost);
      if (!nextProgress) return false;
      setPlayerProgress(nextProgress);
      savePlayerProgress(nextProgress);
      return true;
    },
    [playerProgress],
  );

  const equipCar = useCallback(
    (carId: CarId) => {
      const nextProgress = selectCar(playerProgress, carId);
      if (nextProgress === playerProgress) return;
      setPlayerProgress(nextProgress);
      savePlayerProgress(nextProgress);
    },
    [playerProgress],
  );

  const unlockGuideReview = useCallback(
    (guideId: string, cost: number) => {
      const nextProgress = redeemGuideReview(playerProgress, guideId, cost);
      if (!nextProgress) return false;
      setPlayerProgress(nextProgress);
      savePlayerProgress(nextProgress);
      return true;
    },
    [playerProgress],
  );

  const resetRace = useCallback(
    (nextLap: number, requiredTopic?: string) => {
      const nextQuestions = sampleRaceQuestions(
        studySet,
        buildLap(studySet, nextLap).length,
        previousRaceQuestionIdsRef.current,
        requiredTopic,
      );
      previousRaceQuestionIdsRef.current = new Set(
        nextQuestions.map((question) => question.id),
      );
      setQuestions(nextQuestions);
      setQuestionIndex(0);
      setSelectedIndex(null);
      setRecords([]);
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
    setQuestions(shuffleAnswerChoices(buildLap(nextStudySet, 0)));
    previousRaceQuestionIdsRef.current = new Set();
    setQuestionIndex(0);
    setSelectedIndex(null);
    setRecords([]);
    setStreak(0);
    setSpeed(0);
    setLastReward(null);
    raceCompletionRef.current = false;
    setLap(0);
  }, []);

  const practiceWeakestSector = useCallback(
    (topic?: string) => {
      const weakestTopic = topic ?? topicSummary(records)[0]?.topic;
      resetRace(lap + 1, weakestTopic);
    },
    [lap, records, resetRace],
  );

  const selectBuiltInSet = useCallback(
    (setId: string) => {
      const nextStudySet = studySets.find((set) => set.id === setId);
      if (nextStudySet) importSet(nextStudySet);
    },
    [importSet],
  );

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

      setSelectedIndex(answerIndex);
      setStreak(nextStreak);
      setSpeed(
        correct ? speedForAnswer(currentQuestion.difficulty, nextStreak) : 34,
      );
      setRecords((current) => [
        ...current,
        {
          question: currentQuestion,
          selectedIndex: answerIndex,
          correct,
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
    if (screen !== 'report') return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key.toLowerCase() !== 'r' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.matches('input, textarea, select, [contenteditable="true"]')
      )
        return;

      event.preventDefault();
      practiceWeakestSector();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [practiceWeakestSector, screen]);

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
    onStartSolo: () => resetRace(0),
    onAnswer: submitAnswer,
    onAdvance: advance,
  });

  return (
    <main className="app-shell">
      <AppHeader
        playerProgress={playerProgress}
        screen={screen}
        onLocker={() => setScreen("locker")}
        onHome={
          screen === "multiplayer" ? exitMultiplayer : () => setScreen("garage")
        }
      />
      {screen === "garage" && (
        <Garage
          mode={garageMode}
          onMode={setGarageMode}
          onStart={() => resetRace(0)}
          questionTimeLimitSeconds={questionTimeLimitSeconds}
          onQuestionTimeLimitChange={setQuestionTimeLimitSeconds}
          onImport={importSet}
          onSelectSet={selectBuiltInSet}
          onUnlockGuide={unlockGuideReview}
          onLocker={() => setScreen("locker")}
          selectedCar={selectedCar}
          playerProgress={playerProgress}
          studySet={studySet}
          onMultiplayerConnected={(session, room) => {
            setMultiplayer({ session, room });
            setScreen("multiplayer");
          }}
        />
      )}
      {screen === "locker" && (
        <CarLocker
          playerProgress={playerProgress}
          onBack={() => setScreen("garage")}
          onRedeem={redeemLockerCar}
          onSelect={equipCar}
        />
      )}
      {screen === "race" && currentQuestion && (
        <RaceScreen
          answeredCount={answeredCount}
          boost={boost}
          car={selectedCar}
          currentQuestion={currentQuestion}
          onAdvance={advance}
          onAnswer={submitAnswer}
          progress={progress}
          questionCount={questions.length}
          questionIndex={questionIndex}
          selectedIndex={selectedIndex}
          speed={speed}
          streak={streak}
          nextButtonRef={nextButtonRef}
          questionTimeLimitSeconds={questionTimeLimitSeconds}
        />
      )}
      {screen === "report" && (
        <PitReport
          lap={lap}
          lastReward={lastReward}
          playerProgress={playerProgress}
          records={records}
          studySet={studySet}
          onRetry={practiceWeakestSector}
          onGarage={() => setScreen("garage")}
          onLocker={() => setScreen("locker")}
        />
      )}
      {screen === "multiplayer" && multiplayer && (
        <MultiplayerRoom
          initialRoom={multiplayer.room}
          selectedCar={selectedCar}
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
  onLocker,
  onHome,
}: {
  playerProgress: PlayerProgress;
  screen: Screen;
  onLocker: () => void;
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
      {screen === "locker" ? (
        <div className="header-status" aria-label="Current location">
          <span>Garage</span>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="is-active">Car locker</span>
        </div>
      ) : (
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
      )}
      <button
        className="header-chip header-chip--button"
        disabled={screen === "race" || screen === "multiplayer"}
        onClick={onLocker}
        type="button"
        aria-label={`${playerProgress.longestStreak} best streak, ${playerProgress.tokens} tokens`}
      >
        <Flame size={15} aria-hidden="true" /> Best streak{" "}
        <strong>{playerProgress.longestStreak}</strong>
        <span className="header-chip__divider" />
        <Coins size={15} aria-hidden="true" />
        <strong>{playerProgress.tokens}</strong>
      </button>
    </header>
  );
}

function Garage({
  mode,
  onMode,
  onStart,
  questionTimeLimitSeconds,
  onQuestionTimeLimitChange,
  onImport,
  onSelectSet,
  onUnlockGuide,
  onLocker,
  onMultiplayerConnected,
  selectedCar,
  playerProgress,
  studySet,
}: {
  mode: GarageMode;
  onMode: (mode: GarageMode) => void;
  onStart: () => void;
  questionTimeLimitSeconds: number | null;
  onQuestionTimeLimitChange: (seconds: number | null) => void;
  onImport: (studySet: StudySet) => void;
  onSelectSet: (setId: string) => void;
  onUnlockGuide: (guideId: string, cost: number) => boolean;
  onLocker: () => void;
  onMultiplayerConnected: (
    session: MultiplayerSession,
    room: MultiplayerRoomState,
  ) => void;
  selectedCar: CarSpec;
  playerProgress: PlayerProgress;
  studySet: StudySet;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const builtIn = studySets.some((set) => set.id === studySet.id);
  const lapQuestionCount = buildLap(studySet, 0).length;
  const conceptCount = Math.min(
    10,
    new Set(studySet.questions.map((question) => question.conceptId)).size,
  );
  const variantCount = Math.min(
    3,
    Math.max(
      2,
      ...Array.from(
        new Map(
          studySet.questions.map((question) => [question.conceptId, question]),
        ).keys(),
      ).map(
        (conceptId) =>
          studySet.questions.filter(
            (question) => question.conceptId === conceptId,
          ).length,
      ),
    ),
  );
  const reviewCost = guideReviewCost(studySet);
  const reviewUnlocked = playerProgress.unlockedGuideIds.includes(studySet.id);
  const reviewShortfall = Math.max(0, reviewCost - playerProgress.tokens);

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

        <button className="garage-locker-entry" onClick={onLocker} type="button">
          <span className="garage-locker-entry__car" aria-hidden="true">
            <RaceCarModel car={selectedCar} />
          </span>
          <span>
            <small>Current ride</small>
            <strong>{selectedCar.name}</strong>
          </span>
          <span>Open car locker <ArrowRight size={15} aria-hidden="true" /></span>
        </button>

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
          <>
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
                {builtIn ? "Ready" : "Imported"}
              </span>
            </div>
            <div className="study-set-card__picker">
              <label className="study-set-picker">
                <span>Choose a study set</span>
                <select
                  aria-label="Choose a built-in study set"
                  onChange={(event) => onSelectSet(event.target.value)}
                  value={builtIn ? studySet.id : ''}
                >
                  <option value="" disabled>
                    Imported study set
                  </option>
                  {studySetGroups.map((group) => (
                    <optgroup key={group.subject} label={group.subject}>
                      {group.sets.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.course} · {set.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            <RaceTimerSetting value={questionTimeLimitSeconds} onChange={onQuestionTimeLimitChange} />
            <div className="study-set-card__stats">
              <div>
                <strong>{lapQuestionCount}</strong>
                <span>questions per lap</span>
              </div>
              <div>
                <strong>{conceptCount}</strong>
                <span>concepts</span>
              </div>
              <div>
                <strong>{variantCount}×</strong>
                <span>question variants</span>
              </div>
            </div>
            <div className="study-set-card__action">
              <p>
                <Sparkles size={16} aria-hidden="true" /> A recovery lap swaps
                in matched questions—not repeats.
              </p>
              <div className="study-set-card__buttons">
                <Button
                  className="review-guide-button"
                  disabled={!reviewUnlocked && reviewShortfall > 0}
                  onClick={() => {
                    if (reviewUnlocked || onUnlockGuide(studySet.id, reviewCost)) {
                      setReviewOpen(true);
                    }
                  }}
                  size="lg"
                  variant="outline"
                >
                  {reviewUnlocked ? (
                    <BookOpen size={17} aria-hidden="true" />
                  ) : (
                    <Lock size={17} aria-hidden="true" />
                  )}
                  {reviewUnlocked
                    ? 'Review guide'
                    : reviewShortfall > 0
                      ? `Need ${reviewShortfall} tokens for review guide`
                      : `Unlock review guide · ${reviewCost}`}
                  {!reviewUnlocked && <Coins size={15} aria-hidden="true" />}
                </Button>
                <StudyGuideImporter onImport={onImport} />
                <Button className="start-button" size="lg" onClick={onStart}>
                  Start race <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </article>
          {reviewOpen && (
            <GuideReview
              studySet={studySet}
              onClose={() => setReviewOpen(false)}
            />
          )}
          </>
        ) : (
          <MultiplayerGarage
            onConnected={onMultiplayerConnected}
            onImport={onImport}
            onSelectSet={onSelectSet}
            studySet={studySet}
            questionTimeLimitSeconds={questionTimeLimitSeconds}
            onQuestionTimeLimitChange={onQuestionTimeLimitChange}
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
                  <RaceCarModel car={selectedCar} />
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
            Race briefing · {lapQuestionCount} turns
          </span>
          <h2>{lapQuestionCount} questions. One clean lap.</h2>
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

function GuideReview({
  studySet,
  onClose,
}: {
  studySet: StudySet;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="guide-review__panel" showCloseButton={false}>
        <header className="guide-review__header">
          <div>
            <span className="telemetry-label">Guide review · {studySet.course}</span>
            <h2 id="guide-review-title">{studySet.title}</h2>
            <p>{studySet.questions.length} questions with answers and explanations.</p>
          </div>
          <Button onClick={onClose} size="sm" variant="outline">
            Close <X size={16} aria-hidden="true" />
          </Button>
        </header>
        <div className="guide-review__summary" aria-label="Guide review summary">
          <span>{studySet.questions.length} question bank</span>
          <span>Correct answers highlighted</span>
          <span>Explanations included</span>
        </div>
        <div className="guide-review__questions">
          {studySet.questions.map((question, index) => (
            <article className="guide-review__question" key={question.id}>
              <div className="guide-review__meta">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{question.topic}</span>
              </div>
              <h3>{question.prompt}</h3>
              <ol>
                {question.choices.map((choice, choiceIndex) => (
                  <li
                    className={
                      choiceIndex === question.answerIndex ? 'is-correct' : ''
                    }
                    key={`${question.id}-${choice}`}
                  >
                    {choice}
                    {choiceIndex === question.answerIndex && <Check size={15} aria-label="Correct answer" />}
                  </li>
                ))}
              </ol>
              <p className="guide-review__explanation">{question.explanation}</p>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type RaceScreenProps = {
  answeredCount: number;
  boost: boolean;
  car: CarSpec;
  currentQuestion: StudyQuestion;
  onAdvance: () => void;
  onAnswer: (index: number) => void;
  progress: number;
  questionCount: number;
  questionIndex: number;
  selectedIndex: number | null;
  speed: number;
  streak: number;
  nextButtonRef: React.RefObject<HTMLButtonElement | null>;
  questionTimeLimitSeconds: number | null;
};

function RaceScreen(props: RaceScreenProps) {
  const {
    answeredCount,
    boost,
    car,
    currentQuestion,
    onAdvance,
    onAnswer,
    progress,
    questionCount,
    questionIndex,
    selectedIndex,
    speed,
    streak,
    nextButtonRef,
    questionTimeLimitSeconds,
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
          <span className="telemetry-label">Streak</span>
          <strong className={streak > 1 ? "hot" : ""}>{streak}×</strong>
        </div>
      </div>

      <RaceTrack progress={progress} speed={speed} boost={boost} car={car} />

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
          {questionTimeLimitSeconds !== null && <QuestionTimer key={questionIndex} onExpire={() => onAnswer(-1)} paused={answered} seconds={questionTimeLimitSeconds} />}
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
                  <RotateCcw size={18} aria-hidden="true" /> {selectedIndex === -1 ? 'Time ran out' : 'Pit check'}
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
  studySet,
  onRetry,
  onGarage,
  onLocker,
}: {
  lap: number;
  lastReward: RaceReward | null;
  playerProgress: PlayerProgress;
  records: AnswerRecord[];
  studySet: StudySet;
  onRetry: (topic?: string) => void;
  onGarage: () => void;
  onLocker: () => void;
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
        <div className="report-summary">
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
          <Button
            aria-keyshortcuts="r"
            className="start-button"
            size="lg"
            onClick={() => onRetry(weakest?.topic)}
          >
            Practice weakest sector <kbd>R</kbd>
            <RotateCcw size={17} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="lg" onClick={onGarage}>
            Back to garage
          </Button>
          <Button variant="outline" size="lg" onClick={onLocker}>
            Car locker <Coins size={17} aria-hidden="true" />
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
                      {learningResources(topic.topic, studySet).map(
                        (resource) => (
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
                        ),
                      )}
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

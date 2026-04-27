import { useEffect, useMemo, useState } from "react";
import { questions } from "./data/questions";

const QUIZ_DURATION = 35 * 60;
const STORAGE_KEY = "quiz-master-pro-state-v2";

const levelTone = {
  Easy: "tone-easy",
  Medium: "tone-medium",
  Hard: "tone-hard",
};

const createInitialState = () => ({
  currentIndex: 0,
  selectedAnswers: {},
  checkedCodeAnswers: {},
  showResults: false,
  timeLeft: QUIZ_DURATION,
  reviewMode: false,
});

const normalizeCodeAnswer = (value) =>
  value
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(/\s*=\s*/g, "=")
    .replace(/\s*>\s*/g, ">")
    .replace(/\s*<\s*/g, "<");

const loadStoredState = () => {
  if (typeof window === "undefined") {
    return createInitialState();
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return createInitialState();
    }

    const parsedState = JSON.parse(rawState);
    const safeIndex = Number.isInteger(parsedState.currentIndex)
      ? Math.min(Math.max(parsedState.currentIndex, 0), questions.length - 1)
      : 0;
    const safeTime = Number.isInteger(parsedState.timeLeft)
      ? Math.min(Math.max(parsedState.timeLeft, 0), QUIZ_DURATION)
      : QUIZ_DURATION;

    return {
      currentIndex: safeIndex,
      selectedAnswers: parsedState.selectedAnswers || {},
      checkedCodeAnswers: parsedState.checkedCodeAnswers || {},
      showResults: Boolean(parsedState.showResults),
      timeLeft: safeTime,
      reviewMode: Boolean(parsedState.reviewMode),
    };
  } catch (_error) {
    return createInitialState();
  }
};

const formatTime = (totalSeconds) => {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getPerformanceLabel = (score, total) => {
  const percentage = (score / total) * 100;

  if (percentage >= 85) {
    return "Front-End Champion";
  }

  if (percentage >= 65) {
    return "Strong Builder";
  }

  if (percentage >= 40) {
    return "Rising Developer";
  }

  return "Keep Practicing";
};

function App() {
  const [quizState, setQuizState] = useState(loadStoredState);
  const { currentIndex, selectedAnswers, showResults, timeLeft, reviewMode } = quizState;
  const currentQuestion = questions[currentIndex];
  const selectedOption = selectedAnswers[currentIndex] || "";
  const checkedCodeAnswers = quizState.checkedCodeAnswers || {};
  const isCodeQuestion = currentQuestion.kind === "Code";
  const hasAnsweredCurrent = Boolean(selectedOption.trim());
  const isCurrentAnswerCorrect = isCodeQuestion
    ? normalizeCodeAnswer(selectedOption) === normalizeCodeAnswer(currentQuestion.answer)
    : selectedOption === currentQuestion.answer;
  const hasCheckedCurrentCode = Boolean(checkedCodeAnswers[currentIndex]);
  const answeredCount = questions.reduce((count, _question, index) => {
    return count + (String(selectedAnswers[index] || "").trim() ? 1 : 0);
  }, 0);
  const progress = (answeredCount / questions.length) * 100;
  const unansweredQuestions = questions.length - answeredCount;
  const allQuestionsAnswered = unansweredQuestions === 0;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quizState));
  }, [quizState]);

  useEffect(() => {
    if (showResults) {
      return undefined;
    }

    if (timeLeft === 0) {
      setQuizState((previousState) => ({
        ...previousState,
        showResults: true,
        reviewMode: false,
      }));
      return undefined;
    }

    const timer = window.setInterval(() => {
      setQuizState((previousState) => ({
        ...previousState,
        timeLeft: Math.max(previousState.timeLeft - 1, 0),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showResults, timeLeft]);

  const score = useMemo(
    () =>
      questions.reduce((total, question, index) => {
        return total + (selectedAnswers[index] === question.answer ? 1 : 0);
      }, 0),
    [selectedAnswers]
  );

  const categorySummary = useMemo(() => {
    const summaryMap = {};

    questions.forEach((question, index) => {
      if (!summaryMap[question.category]) {
        summaryMap[question.category] = { total: 0, correct: 0 };
      }

      summaryMap[question.category].total += 1;

      if (selectedAnswers[index] === question.answer) {
        summaryMap[question.category].correct += 1;
      } else if (
        question.kind === "Code" &&
        normalizeCodeAnswer(selectedAnswers[index] || "") === normalizeCodeAnswer(question.answer)
      ) {
        summaryMap[question.category].correct += 1;
      }
    });

    return Object.entries(summaryMap);
  }, [selectedAnswers]);

  const sectionSummary = useMemo(() => {
    const summaryMap = {};

    questions.forEach((question, index) => {
      if (!summaryMap[question.section]) {
        summaryMap[question.section] = { total: 0, correct: 0 };
      }

      summaryMap[question.section].total += 1;

      if (selectedAnswers[index] === question.answer) {
        summaryMap[question.section].correct += 1;
      } else if (
        question.kind === "Code" &&
        normalizeCodeAnswer(selectedAnswers[index] || "") === normalizeCodeAnswer(question.answer)
      ) {
        summaryMap[question.section].correct += 1;
      }
    });

    return Object.entries(summaryMap);
  }, [selectedAnswers]);

  const sections = useMemo(
    () => [...new Set(questions.map((question) => question.section))],
    []
  );

  const handleSelectAnswer = (option) => {
    setQuizState((previousState) => ({
      ...previousState,
      selectedAnswers: {
        ...previousState.selectedAnswers,
        [currentIndex]: option,
      },
    }));
  };

  const handleCodeAnswerChange = (event) => {
    const value = event.target.value;

    setQuizState((previousState) => ({
      ...previousState,
      selectedAnswers: {
        ...previousState.selectedAnswers,
        [currentIndex]: value,
      },
      checkedCodeAnswers: {
        ...previousState.checkedCodeAnswers,
        [currentIndex]: false,
      },
    }));
  };

  const handleCheckCodeAnswer = () => {
    if (!hasAnsweredCurrent) {
      return;
    }

    setQuizState((previousState) => ({
      ...previousState,
      checkedCodeAnswers: {
        ...previousState.checkedCodeAnswers,
        [currentIndex]: true,
      },
    }));
  };

  const handleQuestionChange = (index) => {
    setQuizState((previousState) => ({
      ...previousState,
      currentIndex: index,
    }));
  };

  const handleSubmitQuiz = () => {
    if (!allQuestionsAnswered) {
      return;
    }

    setQuizState((previousState) => ({
      ...previousState,
      showResults: true,
      reviewMode: false,
    }));
  };

  const handleRestartQuiz = () => {
    const initialState = createInitialState();
    setQuizState(initialState);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const toggleReviewMode = () => {
    setQuizState((previousState) => ({
      ...previousState,
      reviewMode: !previousState.reviewMode,
    }));
  };

  if (showResults) {
    return (
      <div className="app-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <main className="layout layout-results">
          <section className="hero-card result-card">
            <span className="eyebrow">Quiz Complete</span>
            <h1>{getPerformanceLabel(score, questions.length)}</h1>
            <p className="hero-copy">
              You answered <strong>{score}</strong> out of <strong>{questions.length}</strong>{" "}
              questions correctly. Check your section performance and review each answer below.
            </p>

            <div className="result-grid">
              <div className="metric-card">
                <span className="metric-label">Score</span>
                <strong>{Math.round((score / questions.length) * 100)}%</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Attempted</span>
                <strong>{answeredCount}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Unanswered</span>
                <strong>{questions.length - answeredCount}</strong>
              </div>
            </div>

            <div className="category-panel">
              <h2>Section Breakdown</h2>
              <div className="category-list">
                {sectionSummary.map(([section, summary]) => (
                  <div className="category-row" key={section}>
                    <span>{section}</span>
                    <strong>
                      {summary.correct}/{summary.total}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="category-panel">
              <h2>Category Breakdown</h2>
              <div className="category-list">
                {categorySummary.map(([category, summary]) => (
                  <div className="category-row" key={category}>
                    <span>{category}</span>
                    <strong>
                      {summary.correct}/{summary.total}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={toggleReviewMode}>
                {reviewMode ? "Hide Review" : "Review Answers"}
              </button>
              <button className="secondary-btn" onClick={handleRestartQuiz}>
                Restart Quiz
              </button>
            </div>
          </section>

          {reviewMode ? (
            <section className="review-list">
              {questions.map((question, index) => {
                const selectedOption = selectedAnswers[index];
                const isCorrect =
                  question.kind === "Code"
                    ? normalizeCodeAnswer(selectedOption || "") === normalizeCodeAnswer(question.answer)
                    : selectedOption === question.answer;

                return (
                  <article className="review-card" key={question.id}>
                    <div className="review-head">
                      <span className="question-index">
                        Question {index + 1} | {question.section}
                      </span>
                      <div className="review-tags">
                        <span className="pill">{question.category}</span>
                        <span className={`pill ${levelTone[question.difficulty]}`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <h3>{question.question}</h3>
                    {question.codeSnippet ? (
                      <pre className="code-box review-code-box">
                        <code>{question.codeSnippet}</code>
                      </pre>
                    ) : null}
                    <p>
                      <strong>Your answer:</strong> {selectedOption || "Not answered"}
                    </p>
                    <p>
                      <strong>Correct answer:</strong> {question.answer}
                    </p>
                    <p className={isCorrect ? "answer-good" : "answer-bad"}>
                      {isCorrect ? "Correct answer selected." : "This one needs another look."}
                    </p>
                    <p className="explanation">{question.explanation}</p>
                  </article>
                );
              })}
            </section>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="layout">
        <section className="hero-card">
          <div className="hero-top">
            <div>
              <span className="eyebrow">React Vite Front-End Quiz</span>
              <h1>Quiz Master Pro</h1>
            </div>
            <div className="timer-card">
              <span>Time Left</span>
              <strong>{formatTime(timeLeft)}</strong>
            </div>
          </div>

          <p className="hero-copy">
            A 50-question HTML and CSS exam with 25 theory questions and 25 code-based
            questions. It covers HTML through HTML5 features plus CSS implementation,
            selectors, and box model only.
          </p>

          <div className="progress-panel">
            <div className="progress-meta">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>{Math.round(progress)}% completed</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="hero-actions">
            <button className="secondary-btn reset-btn" onClick={handleRestartQuiz}>
              Reset Quiz
            </button>
          </div>
        </section>

        <section className="quiz-grid">
          <aside className="sidebar-card">
            <div className="sidebar-header">
              <h2>Navigator</h2>
              <span>{answeredCount} answered</span>
            </div>

            <div className="section-chip-list">
              {sections.map((section) => (
                <span key={section} className="section-chip">
                  {section}
                </span>
              ))}
            </div>

            <div className="question-dots">
              {questions.map((question, index) => {
                const isAnswered = Boolean(selectedAnswers[index]);
                const isActive = currentIndex === index;

                return (
                  <button
                    key={question.id}
                    className={`dot-btn ${isAnswered ? "is-answered" : ""} ${
                      isActive ? "is-active" : ""
                    }`}
                    onClick={() => handleQuestionChange(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="insight-card">
              <span className="insight-label">Focus Mode</span>
              <strong>{unansweredQuestions} questions left</strong>
              <p>Refresh-safe progress is on. Finish every question to unlock final submission.</p>
            </div>
          </aside>

          <section className="question-card">
            <div className="question-top">
              <div className="review-tags">
                <span className="pill">{currentQuestion.section}</span>
                <span className="pill">{currentQuestion.category}</span>
                <span className="pill kind-pill">{currentQuestion.kind}</span>
                <span className={`pill ${levelTone[currentQuestion.difficulty]}`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            <h2>{currentQuestion.question}</h2>

            {currentQuestion.codeSnippet ? (
              <div className="code-panel">
                <div className="code-panel-head">
                  <span className="eyebrow">Code Section</span>
                </div>
                <pre className="code-box">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              </div>
            ) : null}

            {isCodeQuestion ? (
              <div className="code-answer-panel">
                <label className="code-answer-label" htmlFor={`code-answer-${currentQuestion.id}`}>
                  Write your code answer
                </label>
                <textarea
                  id={`code-answer-${currentQuestion.id}`}
                  className="code-answer-input"
                  value={selectedOption}
                  onChange={handleCodeAnswerChange}
                  placeholder="Type the correct HTML or CSS code here..."
                  spellCheck="false"
                />
                <div className="code-answer-actions">
                  <button
                    className="primary-btn"
                    onClick={handleCheckCodeAnswer}
                    disabled={!hasAnsweredCurrent}
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div className="options-list">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrectOption = option === currentQuestion.answer;
                  const optionStateClass = hasAnsweredCurrent
                    ? isCorrectOption
                      ? "is-correct"
                      : isSelected
                        ? "is-wrong"
                        : "is-dimmed"
                    : "";

                  return (
                    <button
                      key={option}
                      className={`option-card ${isSelected ? "selected" : ""} ${optionStateClass}`}
                      onClick={() => handleSelectAnswer(option)}
                    >
                      <span className="option-marker">
                        {hasAnsweredCurrent
                          ? isCorrectOption
                            ? "OK"
                            : isSelected
                              ? "NO"
                              : ""
                          : isSelected
                            ? "OK"
                            : ""}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {hasAnsweredCurrent && (!isCodeQuestion || hasCheckedCurrentCode) ? (
              <div className={`answer-feedback ${isCurrentAnswerCorrect ? "feedback-correct" : "feedback-wrong"}`}>
                <strong>{isCurrentAnswerCorrect ? "Correct answer." : "Wrong answer."}</strong>
                <span> Correct answer: {currentQuestion.answer}</span>
              </div>
            ) : null}

            {!allQuestionsAnswered ? (
              <div className="warning-card">
                Answer all {questions.length} questions to enable final submission. Remaining:
                {" "}
                <strong>{unansweredQuestions}</strong>
              </div>
            ) : null}

            <div className="question-footer">
              <button
                className="secondary-btn"
                onClick={() => handleQuestionChange(Math.max(currentIndex - 1, 0))}
                disabled={currentIndex === 0}
              >
                Previous
              </button>

              <div className="footer-actions">
                {currentIndex < questions.length - 1 ? (
                  <button
                    className="primary-btn"
                    onClick={() =>
                      handleQuestionChange(Math.min(currentIndex + 1, questions.length - 1))
                    }
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    className="primary-btn"
                    onClick={handleSubmitQuiz}
                    disabled={!allQuestionsAnswered}
                    title={!allQuestionsAnswered ? "Answer all questions first" : "Submit quiz"}
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;

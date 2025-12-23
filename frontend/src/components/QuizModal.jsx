import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Trophy, RotateCcw, HelpCircle, ToggleLeft, Type, MessageSquare } from 'lucide-react';
import apiClient from '../apiClient';
import { Button } from './ui/button';
import { GradientButton } from './ui/gradient-button';
import { GlassCard } from './ui/glass-card';
import { ProgressBar } from './ui/progress-bar';

// Question type icons and labels
const questionTypeInfo = {
  mcq: { icon: HelpCircle, label: 'Multiple Choice', color: 'text-blue-500' },
  true_false: { icon: ToggleLeft, label: 'True/False', color: 'text-purple-500' },
  fill_blank: { icon: Type, label: 'Fill in Blank', color: 'text-amber-500' },
  short_answer: { icon: MessageSquare, label: 'Short Answer', color: 'text-emerald-500' },
};

const QuizModal = ({ quiz, courseId, courseName, onClose }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({}); // For fill-blank and short answer
  const [showResults, setShowResults] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleAnswerSelect = (questionIndex, optionKey) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionKey,
    });
  };

  const handleTextAnswer = (questionIndex, text) => {
    setTextAnswers({
      ...textAnswers,
      [questionIndex]: text,
    });
  };

  const handleSubmitQuiz = async () => {
    const responsesPayload = quiz.map((q, index) => ({
      question: q.question,
      selected_option: selectedAnswers[index] || "",
      correct_option: q.answer,
    }));

    setIsSubmitting(true);
    try {
      const result = await apiClient.post(`/courses/${courseId}/quizzes/submit`, {
        responses: responsesPayload,
      });
      setSubmissionResult(result.data);
      setShowResults(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOptionClassName = (question, questionIndex, optionKey) => {
    const baseStyles = "w-full text-left p-4 border-2 rounded-xl transition-all duration-200 font-medium";

    if (!showResults) {
      if (selectedAnswers[questionIndex] === optionKey) {
        return `${baseStyles} bg-primary/10 border-primary text-primary`;
      }
      return `${baseStyles} bg-card border-border hover:border-primary/50 hover:bg-primary/5`;
    }

    const isCorrect = optionKey === question.answer;
    const isSelected = selectedAnswers[questionIndex] === optionKey;

    if (isCorrect) {
      return `${baseStyles} bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300`;
    }
    if (isSelected && !isCorrect) {
      return `${baseStyles} bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300`;
    }
    return `${baseStyles} bg-muted/30 border-border/50 text-muted-foreground`;
  };

  // Check if a question is answered (works for all types)
  const isQuestionAnswered = (index) => {
    const q = quiz[index];
    const questionType = q?.type || 'mcq';
    if (questionType === 'fill_blank' || questionType === 'short_answer') {
      return textAnswers[index] && textAnswers[index].trim().length > 0;
    }
    return selectedAnswers[index] !== undefined;
  };

  const answeredCount = quiz.filter((_, i) => isQuestionAnswered(i)).length;
  const progress = (answeredCount / quiz.length) * 100;

  // Calculate correct count for MCQ and T/F only (text answers need manual grading)
  const correctCount = showResults ? quiz.filter((q, i) => {
    const qType = q.type || 'mcq';
    if (qType === 'fill_blank') {
      const userAnswer = (textAnswers[i] || '').toLowerCase().trim();
      const correctAnswer = (q.answer || '').toLowerCase().trim();
      const acceptableAnswers = (q.acceptable_answers || []).map(a => a.toLowerCase().trim());
      return userAnswer === correctAnswer || acceptableAnswers.includes(userAnswer);
    }
    if (qType === 'short_answer') {
      return null; // Short answers need manual review
    }
    return selectedAnswers[i] === q.answer;
  }).filter(x => x !== null).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-border/50"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                {showResults ? '🎉 Quiz Complete!' : `Quiz: ${courseName}`}
              </h2>
              {!showResults && (
                <p className="text-muted-foreground mt-1">
                  Question {currentQuestion + 1} of {quiz.length}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-muted"
            >
              <X size={20} />
            </Button>
          </div>

          {!showResults && (
            <div className="mt-4">
              <ProgressBar progress={progress} showPercentage={false} size="sm" />
              <p className="text-xs text-muted-foreground mt-2">
                {answeredCount} of {quiz.length} answered
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {showResults ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-6"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Trophy size={48} className="text-white" />
                </div>
              </motion.div>

              <h3 className="text-4xl font-display font-bold mb-2">
                {submissionResult?.score.toFixed(0)}%
              </h3>
              <p className="text-muted-foreground mb-6">
                You got {correctCount} out of {quiz.length} correct!
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
                <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="text-emerald-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Correct</p>
                </div>
                <div className="p-4 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <XCircle className="text-red-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{quiz.length - correctCount}</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">Incorrect</p>
                </div>
              </div>

              <h4 className="font-semibold mb-4 text-left">Review Answers:</h4>
              <div className="space-y-4 text-left">
                {quiz.map((q, index) => {
                  const qType = q.type || 'mcq';
                  const userAnswer = qType === 'fill_blank' || qType === 'short_answer'
                    ? textAnswers[index]
                    : selectedAnswers[index];

                  // Determine if answer is correct based on question type
                  let isCorrect = false;
                  if (qType === 'fill_blank') {
                    const normalizedUser = (userAnswer || '').toLowerCase().trim();
                    const normalizedCorrect = (q.answer || '').toLowerCase().trim();
                    const acceptableAnswers = (q.acceptable_answers || []).map(a => a.toLowerCase().trim());
                    isCorrect = normalizedUser === normalizedCorrect || acceptableAnswers.includes(normalizedUser);
                  } else if (qType === 'short_answer') {
                    isCorrect = null; // Needs manual review
                  } else {
                    isCorrect = userAnswer === q.answer;
                  }

                  // Format display answer
                  const formatAnswer = (ans) => {
                    if (!ans) return 'Not answered';
                    if (qType === 'mcq' && q.options && q.options[ans]) {
                      return `${ans} - ${q.options[ans]}`;
                    }
                    return ans;
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-muted/30"
                    >
                      {isCorrect === true ? (
                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                      ) : isCorrect === false ? (
                        <XCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                      ) : (
                        <HelpCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                      )}
                      <div>
                        <p className="font-medium">{q.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your answer: <span className={isCorrect === true ? 'text-emerald-600' : isCorrect === false ? 'text-red-600' : 'text-amber-600'}>
                            {formatAnswer(userAnswer)}
                          </span>
                        </p>
                        {isCorrect === false && (
                          <p className="text-sm text-emerald-600 mt-1">
                            Correct: {formatAnswer(q.answer)}
                          </p>
                        )}
                        {isCorrect === null && (
                          <p className="text-sm text-amber-600 mt-1">
                            This answer requires manual review.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {quiz.map((q, index) => {
                const questionType = q.type || 'mcq';
                const TypeIcon = questionTypeInfo[questionType]?.icon || HelpCircle;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={index === currentQuestion ? 'block' : 'hidden'}
                  >
                    {/* Question Type Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted ${questionTypeInfo[questionType]?.color || 'text-muted-foreground'}`}>
                        <TypeIcon size={12} />
                        {questionTypeInfo[questionType]?.label || 'Question'}
                      </span>
                    </div>

                    <p className="text-lg font-semibold mb-6">{q.question}</p>

                    {/* MCQ - Multiple Choice */}
                    {questionType === 'mcq' && q.options && (
                      <div className="space-y-3">
                        {Object.entries(q.options).map(([key, value]) => (
                          <motion.button
                            key={key}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleAnswerSelect(index, key)}
                            className={getOptionClassName(q, index, key)}
                          >
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted mr-3 text-sm font-bold">
                              {key}
                            </span>
                            {value}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* True/False */}
                    {questionType === 'true_false' && (
                      <div className="flex gap-4">
                        {['True', 'False'].map((option) => (
                          <motion.button
                            key={option}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswerSelect(index, option)}
                            className={`flex-1 p-6 rounded-xl border-2 font-semibold text-lg transition-all ${selectedAnswers[index] === option
                              ? option === 'True'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700'
                                : 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700'
                              : 'bg-card border-border hover:border-primary/50'
                              } ${showResults && q.answer === option ? 'ring-2 ring-emerald-500' : ''}`}
                          >
                            {option === 'True' ? '✓' : '✗'} {option}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Fill in the Blank */}
                    {questionType === 'fill_blank' && (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={textAnswers[index] || ''}
                          onChange={(e) => handleTextAnswer(index, e.target.value)}
                          placeholder="Type your answer..."
                          className="w-full p-4 rounded-xl border-2 border-border bg-card text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          disabled={showResults}
                        />
                        {showResults && (
                          <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <strong>Correct Answer:</strong> {q.answer}
                            {q.acceptable_answers && (
                              <span className="text-sm ml-2">(Also accepted: {q.acceptable_answers.join(', ')})</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short Answer */}
                    {questionType === 'short_answer' && (
                      <div className="space-y-4">
                        <textarea
                          value={textAnswers[index] || ''}
                          onChange={(e) => handleTextAnswer(index, e.target.value)}
                          placeholder="Write your answer (2-3 sentences)..."
                          rows={4}
                          className="w-full p-4 rounded-xl border-2 border-border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                          disabled={showResults}
                        />
                        {showResults && (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                              <strong>Model Answer:</strong> {q.answer}
                            </div>
                            {q.key_points && (
                              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <strong>Key Points:</strong>
                                <ul className="list-disc ml-5 mt-1">
                                  {q.key_points.map((point, i) => <li key={i}>{point}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-muted/30">
          {!showResults ? (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentQuestion < quiz.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    disabled={!isQuestionAnswered(currentQuestion)}
                  >
                    Next
                  </Button>
                ) : (
                  <GradientButton
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting || answeredCount < quiz.length}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      'Submit Quiz'
                    )}
                  </GradientButton>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuizModal;

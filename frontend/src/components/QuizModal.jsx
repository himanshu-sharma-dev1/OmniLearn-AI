import React, { useState } from 'react';
import { X } from 'lucide-react';
import apiClient from '../apiClient';

const QuizModal = ({ quiz, courseId, courseName, onClose }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleAnswerSelect = (questionIndex, optionKey) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionKey,
    });
  };

  const handleSubmitQuiz = async () => {
    const responsesPayload = quiz.map((q, index) => ({
      question: q.question,
      selected_option: selectedAnswers[index] || "", // Default to empty string if not answered
      correct_option: q.answer,
    }));

    try {
      const result = await apiClient.post(`/courses/${courseId}/quizzes/submit`, {
        responses: responsesPayload,
      });
      setSubmissionResult(result.data);
      setShowResults(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      // Optionally, show an error message to the user
    }
  };

  const getOptionClassName = (question, questionIndex, optionKey) => {
    if (!showResults) {
      return selectedAnswers[questionIndex] === optionKey ? 'bg-blue-200 dark:bg-blue-800/50' : 'bg-white dark:bg-card';
    }
    const isCorrect = optionKey === question.answer;
    const isSelected = selectedAnswers[questionIndex] === optionKey;

    if (isCorrect) return 'bg-green-200 border-green-500 text-green-800 dark:bg-green-800/50 dark:border-green-400 dark:text-green-200';
    if (isSelected && !isCorrect) return 'bg-red-200 border-red-500 text-red-800 dark:bg-red-800/50 dark:border-red-400 dark:text-red-200';
    return 'bg-white dark:bg-card text-foreground';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col text-foreground">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Quiz for {courseName}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted dark:hover:bg-muted-foreground/20">
            <X size={24} className="text-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto flex-grow pr-2">
          {quiz.map((q, index) => (
            <div key={index} className="mb-6 pb-4 border-b border-border">
              <p className="font-semibold mb-2">{index + 1}. {q.question}</p>
              <div className="space-y-2">
                {Object.entries(q.options).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => !showResults && handleAnswerSelect(index, key)}
                    className={`w-full text-left p-3 border rounded-md transition-all border-border ${getOptionClassName(q, index, key)}`}
                    disabled={showResults}
                  >
                    <strong>{key}:</strong> {value}
                  </button>
                ))}
              </div>
              {showResults && (
                <div className="mt-3 p-2 rounded-md bg-muted text-muted-foreground">
                  <p className="text-sm font-semibold">Correct Answer: {q.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          {showResults && submissionResult && (
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              Your Score: {submissionResult.score.toFixed(2)}%
            </div>
          )}
          {!showResults ? (
            <button 
              onClick={handleSubmitQuiz}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 ml-auto"
            >
              Submit Quiz
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800 ml-auto"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;

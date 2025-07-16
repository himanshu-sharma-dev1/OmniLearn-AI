import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { ChevronDown, ChevronRight } from 'lucide-react';

const QuizHistory = ({ courseId }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/courses/${courseId}/quizzes/history`);
        setHistory(response.data);
      } catch (error) {
        console.error("Failed to fetch quiz history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [courseId]);

  const toggleAttempt = (attemptId) => {
    setExpandedAttempt(expandedAttempt === attemptId ? null : attemptId);
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading quiz history...</p>;
  }

  if (history.length === 0) {
    return <p className="text-muted-foreground">No quiz attempts found for this course.</p>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-4 text-foreground">Quiz History</h3>
      <div className="space-y-4">
        {history.map((attempt) => (
          <div key={attempt.id} className="border border-border rounded-lg bg-card">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleAttempt(attempt.id)}
            >
              <div>
                <span className="font-semibold text-foreground">Attempt on:</span> <span className="text-muted-foreground">{new Date(attempt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className={`font-bold ${attempt.score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Score: {attempt.score.toFixed(2)}%
                </span>
                {expandedAttempt === attempt.id ? <ChevronDown className="ml-2 text-foreground" /> : <ChevronRight className="ml-2 text-foreground" />}
              </div>
            </div>
            {expandedAttempt === attempt.id && (
              <div className="p-4 border-t border-border bg-muted/50">
                {attempt.responses.map((res, index) => (
                  <div key={index} className={`mb-2 p-2 rounded ${res.is_correct ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                    <p className="font-semibold text-foreground">{index + 1}. {res.question_text}</p>
                    <p className="text-muted-foreground">Your answer: <span className={!res.is_correct ? 'line-through' : ''}>{res.selected_option || "No answer"}</span></p>
                    {!res.is_correct && <p className="text-muted-foreground">Correct answer: {res.correct_option}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizHistory;

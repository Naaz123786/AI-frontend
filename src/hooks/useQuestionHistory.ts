import { useState, useEffect } from 'react';

export interface QuestionHistory {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  userId: string;
}

export const useQuestionHistory = (userId: string | null) => {
  const [questions, setQuestions] = useState<QuestionHistory[]>([]);

  // Load questions from localStorage on mount
  useEffect(() => {
    if (userId) {
      const savedQuestions = localStorage.getItem(`questionHistory_${userId}`);
      if (savedQuestions) {
        try {
          const parsedQuestions = JSON.parse(savedQuestions).map((q: any) => ({
            ...q,
            timestamp: new Date(q.timestamp)
          }));
          setQuestions(parsedQuestions);
        } catch (error) {
          console.error('Error parsing saved questions:', error);
          setQuestions([]);
        }
      }
    }
  }, [userId]);

  // Save questions to localStorage whenever questions change
  useEffect(() => {
    if (userId && questions.length > 0) {
      localStorage.setItem(`questionHistory_${userId}`, JSON.stringify(questions));
    }
  }, [questions, userId]);

  const addQuestion = (question: string, answer: string) => {
    if (!userId) return;
    
    const newQuestion: QuestionHistory = {
      id: Date.now().toString(),
      question,
      answer,
      timestamp: new Date(),
      userId
    };
    
    setQuestions(prev => [newQuestion, ...prev]);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    
    // Update localStorage after deletion
    if (userId) {
      const updatedQuestions = questions.filter(q => q.id !== id);
      if (updatedQuestions.length > 0) {
        localStorage.setItem(`questionHistory_${userId}`, JSON.stringify(updatedQuestions));
      } else {
        localStorage.removeItem(`questionHistory_${userId}`);
      }
    }
  };

  const clearAllQuestions = () => {
    setQuestions([]);
    if (userId) {
      localStorage.removeItem(`questionHistory_${userId}`);
    }
  };

  return {
    questions,
    addQuestion,
    deleteQuestion,
    clearAllQuestions,
    questionCount: questions.length
  };
};

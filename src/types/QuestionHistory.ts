export interface QuestionHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuestionHistory {
  items: QuestionHistoryItem[];
  totalCount: number;
  lastUpdated: Date;
}

export enum AppStep {
  CATEGORY_SELECTION = 0,
  TOPIC_SELECTION = 1,
  GENERATING = 2,
  RESULT = 3,
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Topic {
  id: string;
  title: string;
  seoScore: number; // Simulated score for UI
  keyword: string;
}

export interface GeneratedPost {
  title: string;
  content: string;
  tags: string[];
}

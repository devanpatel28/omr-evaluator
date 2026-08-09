export interface Test {
  id: number;
  name: string;
  total_questions: number;
  correct_marks: number;
  wrong_marks: number;
  e_marks: number;
  unanswered_marks: number;
  created_at: string;
  updated_at?: string;
  evaluation_count: number;
  answer_key_count: number;
}

export interface AnswerKeyItem {
  question_number: number;
  correct_answer: string;
}

export interface EvaluationAnswer {
  id: number;
  question_number: number;
  detected_answer: string | null;
  correct_answer: string | null;
  final_answer: string | null;
  result_type: string | null;
  marks: number | null;
  confidence: number | null;
  detection_method: string;
  fill_ratios: string | null;
}

export interface Evaluation {
  id: number;
  test_id: number;
  source_file: string | null;
  processed_file: string | null;
  total_marks: number;
  correct_count: number;
  wrong_count: number;
  e_count: number;
  unanswered_count: number;
  ambiguous_count: number;
  correct_marks_snapshot: number;
  wrong_marks_snapshot: number;
  e_marks_snapshot: number;
  unanswered_marks_snapshot: number;
  test_name_snapshot: string | null;
  is_finalized: number;
  created_at: string;
  answers: EvaluationAnswer[];
}

export interface EvaluationSummary {
  id: number;
  test_id: number;
  total_marks: number;
  correct_count: number;
  wrong_count: number;
  e_count: number;
  unanswered_count: number;
  ambiguous_count: number;
  is_finalized: number;
  created_at: string;
}

export interface ProcessingStep {
  name: string;
  status: "pending" | "done" | "error";
  message: string;
}

export interface OMRProcessResult {
  evaluation_id: number;
  success: boolean;
  steps: ProcessingStep[];
  warnings: string[];
  summary: {
    total_questions: number;
    correct: number;
    wrong: number;
    e: number;
    unanswered: number;
    ambiguous: number;
    score: number;
  };
  ambiguous_questions: number[];
  bubble_crops: Record<number, string>;
  debug_image: string | null;
}

export type ResultType = "CORRECT" | "WRONG" | "E" | "UNANSWERED" | "AMBIGUOUS";

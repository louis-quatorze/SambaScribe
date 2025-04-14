export interface AiNotationData {
  id: string;
  title: string;
  content: string;
  summary: string;
  keyPoints: string[];
  createdAt: Date;
  filename: string;
  aiSummary: string;
  mnemonics: Array<{
    text: string;
    pattern?: string;
    description?: string;
  }>;
}

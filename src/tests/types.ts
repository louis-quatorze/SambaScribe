// Mock types for testing purposes
export interface TestMessage {
  content: string;
  role?: string;
}

export interface TestGenerateChatCompletionParams {
  model: string;
  messages: TestMessage[];
} 
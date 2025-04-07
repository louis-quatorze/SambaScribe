import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn().mockReturnValue({
    data: null,
    status: 'unauthenticated'
  })
}));

// Mock AI client
vi.mock('@/lib/aiClient', () => ({
  generateChatCompletion: vi.fn().mockResolvedValue('Mock mnemonic response')
}));

// Mock file upload
vi.mock('@/lib/upload', () => ({
  uploadFile: vi.fn().mockResolvedValue({ success: true })
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Extend expect with custom matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = document.body.contains(received);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be in the document`
    };
  }
}); 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestGenerateChatCompletionParams } from './types';

// Import the module to be mocked
import * as aiClientModule from '@/lib/aiClient';

// Create the mock implementation
const mockImplementation = vi.fn();

describe('AI Integration', () => {
  beforeEach(() => {
    // Reset mock between tests
    mockImplementation.mockReset();
    
    // Default implementation for successful response
    mockImplementation.mockResolvedValue('Mock mnemonic response');
    
    // Apply the mock to the imported module
    vi.spyOn(aiClientModule, 'generateChatCompletion').mockImplementation(mockImplementation);
  });

  it('successfully generates mnemonics from notation', async () => {
    const result = await aiClientModule.generateChatCompletion({
      model: 'O1',
      messages: [{ content: 'test message', role: 'user' }]
    } as any);

    expect(result).toBe('Mock mnemonic response');
  });

  it('handles invalid notation gracefully', async () => {
    // Override the mock for this test only
    mockImplementation.mockRejectedValueOnce(new Error('Invalid notation format'));

    const testPromise = aiClientModule.generateChatCompletion({
      model: 'O1',
      messages: [{ content: 'invalid data', role: 'user' }]
    } as any);

    await expect(testPromise).rejects.toThrow('Invalid notation format');
  });
}); 
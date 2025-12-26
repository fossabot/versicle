import { describe, it, expect, beforeEach } from 'vitest';
import { useGenAIStore } from './useGenAIStore';

describe('useGenAIStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useGenAIStore.getState().init(); // Reset or re-init if needed
    useGenAIStore.setState({
        apiKey: '',
        model: 'gemini-2.5-flash-lite',
        isEnabled: false,
        logs: [],
        usageStats: { totalTokens: 0, estimatedCost: 0 }
    });
  });

  it('should not persist apiKey or logs to localStorage', () => {
    const sensitiveKey = 'secret-api-key-123';
    const logEntry = {
        id: '1',
        timestamp: 123,
        type: 'request' as const,
        method: 'test',
        payload: { prompt: 'secret prompt' }
    };

    useGenAIStore.getState().setApiKey(sensitiveKey);
    useGenAIStore.getState().addLog(logEntry);
    useGenAIStore.getState().setEnabled(true);

    // Force rehydration (simulate reload)
    // Zustand persist middleware writes to localStorage synchronously by default
    const storedString = localStorage.getItem('genai-storage');
    expect(storedString).toBeTruthy();

    const stored = JSON.parse(storedString!);
    const state = stored.state;

    // These should NOT be in the stored state
    expect(state.apiKey).toBeUndefined();
    expect(state.logs).toBeUndefined();

    // These SHOULD be persisted
    expect(state.isEnabled).toBe(true);
    expect(state.model).toBe('gemini-2.5-flash-lite');
  });
});

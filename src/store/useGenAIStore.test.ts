import { describe, it, expect, beforeEach } from 'vitest';
import { useGenAIStore } from './useGenAIStore';

describe('useGenAIStore', () => {
  beforeEach(() => {
    // Clear both storages to be safe
    localStorage.clear();
    sessionStorage.clear();

    useGenAIStore.getState().init();
    useGenAIStore.setState({
        apiKey: '',
        model: 'gemini-2.5-flash-lite',
        isEnabled: false,
        logs: [],
        usageStats: { totalTokens: 0, estimatedCost: 0 }
    });
  });

  it('should persist apiKey and logs to sessionStorage (not localStorage)', () => {
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

    // Check localStorage (should be empty of this key)
    const localStored = localStorage.getItem('genai-storage');
    expect(localStored).toBeNull();

    // Check sessionStorage (should have the data)
    const sessionStored = sessionStorage.getItem('genai-storage');
    expect(sessionStored).toBeTruthy();

    const stored = JSON.parse(sessionStored!);
    const state = stored.state;

    // These SHOULD be persisted in sessionStorage now
    expect(state.apiKey).toBe(sensitiveKey);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].id).toBe('1');
    expect(state.isEnabled).toBe(true);
  });
});

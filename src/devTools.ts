// Development tools for testing serial input without hardware

interface DevToolsAPI {
  simulateWeight: (weight: number) => void;
  simulateSequence: (weights: number[], delay?: number) => void;
}

export function initDevTools(verwerkMeting: (weight: number) => void): void {
  if (!import.meta.env.DEV) return;

  const api: DevToolsAPI = {
    simulateWeight: (weight: number) => {
      console.log(`[DevTools] Simulating weight: ${weight}g`);
      verwerkMeting(weight);
    },

    simulateSequence: async (weights: number[], delay: number = 500) => {
      console.log(`[DevTools] Starting sequence: ${weights.join(', ')}g with ${delay}ms delay`);
      for (let i = 0; i < weights.length; i++) {
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[DevTools] Injecting weight ${i + 1}/${weights.length}: ${weights[i]}g`);
        api.simulateWeight(weights[i]);
      }
      console.log('[DevTools] Sequence complete');
    }
  };

  // Expose to window
  (window as any).simulateWeight = api.simulateWeight;
  (window as any).simulateSequence = api.simulateSequence;

  console.log('%c✓ DevTools Ready', 'color: #00aa00; font-weight: bold;');
  console.log('Available commands:');
  console.log('  simulateWeight(123.45)           // Single weight');
  console.log('  simulateSequence([123, 156], 500) // Multiple weights');
}

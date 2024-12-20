interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff?: number;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, delay, backoff = 2 } = options;
  let attempts = 0;
  let currentDelay = delay;

  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      if (attempts === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoff;
    }
  }

  throw new Error('Max retry attempts reached');
} 
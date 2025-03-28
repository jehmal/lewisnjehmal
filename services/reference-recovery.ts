import { BaseReference, ReferenceError } from '@/types/references';
import { ReferenceLoader } from './reference-loader';
import { ReferenceCache } from './reference-cache';

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
}

export class ReferenceRecovery {
  private static instance: ReferenceRecovery;
  private loader: ReferenceLoader;
  private cache: ReferenceCache;
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000
  };

  private constructor() {
    this.loader = ReferenceLoader.getInstance();
    this.cache = ReferenceCache.getInstance();
  }

  public static getInstance(): ReferenceRecovery {
    if (!ReferenceRecovery.instance) {
      ReferenceRecovery.instance = new ReferenceRecovery();
    }
    return ReferenceRecovery.instance;
  }

  /**
   * Attempts to load a reference with retry logic
   */
  public async loadWithRetry(
    ref: BaseReference,
    config: Partial<RetryConfig> = {}
  ): Promise<any> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Check cache first
        const cachedRef = this.cache.get(ref);
        if (cachedRef) {
          console.log(`Cache hit for ${ref.standard.id} ${ref.type} ${ref.referenceNumber}`);
          return cachedRef;
        }

        // Try to load the reference
        const loadedRef = await this.loader.loadReference(ref.standard.id);
        
        // Cache successful load if reference was loaded
        if (loadedRef) {
          this.cache.set(ref, loadedRef);
        }
        return loadedRef;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.warn(
          `Attempt ${attempt}/${retryConfig.maxAttempts} failed for ${ref.standard.id} ${ref.type} ${ref.referenceNumber}:`,
          error
        );

        // If this is the last attempt, throw the error
        if (attempt === retryConfig.maxAttempts) {
          throw this.handleError(lastError, ref);
        }

        // Wait before retrying
        await this.delay(retryConfig.delayMs * attempt);
      }
    }

    throw lastError;
  }

  /**
   * Handles specific error cases and provides recovery suggestions
   */
  private handleError(error: Error, ref: BaseReference): Error {
    if (error instanceof ReferenceError) {
      switch (error.code) {
        case 'LOAD_FAILED':
          return new ReferenceError(
            `Failed to load ${ref.type} ${ref.referenceNumber} from ${ref.standard.id} after multiple attempts. Please check if the file exists and is accessible.`,
            'LOAD_FAILED'
          );
        case 'INVALID_TYPE':
          return new ReferenceError(
            `Invalid reference type: ${ref.type}. Expected 'clause', 'figure', or 'table'.`,
            'INVALID_TYPE'
          );
        default:
          return error;
      }
    }

    return error;
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Attempts to recover from a failed load by trying alternative paths
   */
  public async recoverFromFailure(ref: BaseReference): Promise<any> {
    try {
      // Try loading with retry logic first
      return await this.loadWithRetry(ref);
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      throw error;
    }
  }
} 
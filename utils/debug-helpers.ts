/**
 * Debug helpers for identifying and fixing hard-to-trace errors
 */

/**
 * Traces the call path for match errors
 * @param target The object/value to monitor for match calls
 * @returns A wrapped version of the target that logs match calls
 */
export function traceMatchCalls(target: any): any {
  // Skip if not an object or already traced
  if (!target || typeof target !== 'object' || target.__matchTraced) {
    return target;
  }

  // Mark as traced to avoid double tracing
  Object.defineProperty(target, '__matchTraced', {
    value: true,
    enumerable: false
  });

  // Handle string objects specially
  if (typeof target === 'string' || target instanceof String) {
    const originalMatch = target.match;
    
    // Override the match method
    Object.defineProperty(target, 'match', {
      value: function(regexp: RegExp) {
        console.log('🔍 String.match called:', {
          string: this.slice(0, 100) + (this.length > 100 ? '...' : ''),
          length: this.length,
          regexp: regexp.toString(),
          stack: new Error().stack?.split('\n').slice(1, 5).join('\n')
        });
        
        try {
          return originalMatch.call(this, regexp);
        } catch (error) {
          console.error('❌ String.match error:', error);
          return null;
        }
      },
      writable: true,
      configurable: true
    });
    
    return target;
  }

  // For arrays, trace all elements
  if (Array.isArray(target)) {
    return target.map(item => traceMatchCalls(item));
  }

  // For objects, trace all properties
  const handler = {
    get(obj: any, prop: string | symbol) {
      if (prop === 'match' && typeof obj[prop] === 'function') {
        return function(regexp: RegExp) {
          console.log('🔍 Object.match called:', {
            object: typeof obj === 'string' ? (obj.slice(0, 100) + (obj.length > 100 ? '...' : '')) : obj,
            regexp: regexp.toString(),
            stack: new Error().stack?.split('\n').slice(1, 5).join('\n')
          });
          
          try {
            return obj[prop].call(obj, regexp);
          } catch (error) {
            console.error('❌ Object.match error:', error);
            return null;
          }
        };
      }
      
      const value = obj[prop];
      if (value && typeof value === 'object') {
        return traceMatchCalls(value);
      }
      
      return value;
    }
  };

  return new Proxy(target, handler);
}

/**
 * Deep sanitizes an object by replacing undefined values with null and handling strings.
 * @param obj The object to sanitize
 * @returns A sanitized copy of the object
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  
  if (obj === null) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return obj as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = deepSanitize((obj as Record<string, any>)[key]);
      }
    }
    return result as T;
  }
  
  return obj;
}

/**
 * Monkey patches String.prototype.match to be safer
 * Warning: This affects all match calls in the application!
 */
export function installSafeMatchPrototype(): () => void {
  // Store the original match method
  const originalMatch = String.prototype.match;
  
  // Define a safer replacement
  function safeMatch(this: string, regexp: RegExp | string): RegExpMatchArray | null {
    try {
      if (this === undefined || this === null) {
        console.warn('SafeMatch: Called match on null/undefined string');
        return null;
      }
      
      return originalMatch.call(this, regexp as any);
    } catch (error) {
      console.error('SafeMatch error:', error, {
        string: String(this).slice(0, 100) + (this.length > 100 ? '...' : ''),
        regexp: String(regexp)
      });
      return null;
    }
  }
  
  // Replace the prototype method
  // @ts-ignore - Typescript doesn't like us modifying built-in prototypes
  String.prototype.match = safeMatch;
  
  // Return function to restore original behavior
  return () => {
    // @ts-ignore
    String.prototype.match = originalMatch;
  };
}

/**
 * Wraps figures with tracing information for debugging
 */
export function traceFigures(figures: any[]): any[] {
  if (!figures || !Array.isArray(figures)) {
    console.warn('traceFigures: Invalid figures array:', figures);
    return [];
  }
  
  return figures.map((figure, index) => {
    if (!figure) {
      console.warn(`traceFigures: Figure at index ${index} is ${figure}`);
      return {
        name: `Invalid Figure ${index}`,
        title: 'Invalid Figure Data',
        image: '/figure-placeholder.svg',
        quote: 'This figure data was invalid',
        isFallback: true
      };
    }
    
    // Add tracing
    return new Proxy(figure, {
      get(target, prop) {
        const value = target[prop];
        if (prop === 'name' || prop === 'title' || prop === 'image') {
          console.log(`Figure[${index}].${String(prop)} accessed:`, value);
          if (value === undefined) {
            console.warn(`Figure[${index}].${String(prop)} is undefined!`);
            
            // Return a safe default based on property
            if (prop === 'name') return `Missing Name ${index}`;
            if (prop === 'title') return 'Missing Title';
            if (prop === 'image') return '/figure-placeholder.svg';
          }
        }
        return value;
      }
    });
  });
} 
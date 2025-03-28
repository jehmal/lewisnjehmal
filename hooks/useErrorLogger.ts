import { useEffect } from 'react';

/**
 * A hook that adds global error logging to catch and log JavaScript errors
 * including the exact line and component where errors occur
 */
export function useErrorLogger() {
  useEffect(() => {
    // Store the original console.error method
    const originalConsoleError = console.error;
    
    // Store the original window.onerror handler
    const originalOnError = window.onerror;
    
    // Override console.error to add more context
    console.error = (...args) => {
      // Check if this is a "Cannot read properties of undefined" error
      const errorString = args.join(' ');
      if (errorString.includes('Cannot read properties of undefined')) {
        console.warn('🔍 DETAILED ERROR TRACKING 🔍');
        console.warn('Error context:', {
          location: window.location.href,
          timestamp: new Date().toISOString(),
          errorType: 'Undefined Property Access',
          stack: new Error().stack
        });
        
        // Try to find the component in the stack trace
        const stack = new Error().stack || '';
        const componentMatch = stack.match(/at\s+([A-Za-z0-9_$]+)\s+\(/);
        if (componentMatch && componentMatch[1]) {
          console.warn('Likely component:', componentMatch[1]);
        }
      }
      
      // Call the original method
      originalConsoleError.apply(console, args);
    };
    
    // Add a global error handler
    window.onerror = function(message, source, lineno, colno, error) {
      if (String(message).includes('Cannot read properties of undefined')) {
        console.warn('🚨 GLOBAL ERROR HANDLER CAUGHT ERROR 🚨');
        console.warn('Error details:', {
          message,
          source,
          line: lineno,
          column: colno,
          stack: error?.stack
        });
        
        // Attempt to identify what's undefined
        if (error && error.stack) {
          const matchOpMatch = error.stack.match(/(?:match|includes|indexOf|startsWith)\((.*?)\)/);
          if (matchOpMatch) {
            console.warn('String operation being performed on:', matchOpMatch[1]);
          }
        }
      }
      
      // Call original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Add unhandled promise rejection handler
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (String(event.reason).includes('Cannot read properties of undefined')) {
        console.warn('⚠️ UNHANDLED PROMISE REJECTION ⚠️');
        console.warn('Error details:', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      }
    };
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    
    // Clean up
    return () => {
      console.error = originalConsoleError;
      window.onerror = originalOnError;
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);
} 
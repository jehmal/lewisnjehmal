import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { installSafeMatchPrototype } from '@/utils/debug-helpers';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Install global safe match prototype
    const restoreOriginalMatch = installSafeMatchPrototype();
    
    // Add a global safety patch for all string operations (including match)
    const origMatch = String.prototype.match;
    String.prototype.match = function(regexp) {
      try {
        if (this === undefined || this === null) {
          console.warn('Global String.match called on undefined/null');
          return null;
        }
        return origMatch.call(this, regexp);
      } catch (error) {
        console.error('Global String.match error:', error);
        return null;
      }
    };
    
    // Global error handler for catching "Cannot read properties of undefined"
    const originalError = console.error;
    console.error = function(...args) {
      // Check if this is the specific error we're looking for
      const errorString = args.join(' ');
      if (errorString.includes('Cannot read properties of undefined')) {
        console.warn('⚠️ CAUGHT UNDEFINED ERROR:', {
          error: args[0],
          timestamp: new Date().toISOString(),
          location: window.location.href
        });
        
        // Print stack trace for debugging
        console.warn('Stack trace:', new Error().stack);
      }
      
      // Call original console.error
      originalError.apply(console, args);
    };
    
    // Add a global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && event.error.toString().includes('Cannot read properties of undefined')) {
        console.warn('🚨 Global error handler caught:', {
          message: event.message,
          error: event.error.toString(),
          stack: event.error.stack,
          timestamp: new Date().toISOString()
        });
        
        // Prevent the error from bubbling up further
        event.preventDefault();
      }
    };
    
    // Add a global promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.toString().includes('Cannot read properties of undefined')) {
        console.warn('💥 Unhandled promise rejection:', {
          reason: event.reason.toString(),
          stack: event.reason.stack,
          timestamp: new Date().toISOString()
        });
        
        // Prevent the rejection from bubbling up further
        event.preventDefault();
      }
    };
    
    // Register the handlers
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Clean up
    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      restoreOriginalMatch(); // Restore original String.prototype.match
      String.prototype.match = origMatch; // Restore our original match too
    };
  }, []);
  
  return <Component {...pageProps} />;
} 
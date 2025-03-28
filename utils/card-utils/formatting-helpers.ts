import { Message, Figure } from '@/types/chat';
import { ClauseContent } from '@/types/references';
import { SearchResult } from '@/types/card-types';

/**
 * Safely performs string operations, handling null/undefined
 */
export function safeStringOp(
  value: any, 
  operation: 'match' | 'includes' | 'indexOf' | 'startsWith', 
  arg: string | RegExp
): any {
  try {
    // Log debugging info
    console.log(`🔒 Safe String Op: "${operation}" on ${typeof value} with arg:`, arg);
    
    // Guard against non-string values
    if (value === undefined || value === null) {
      console.warn(`🚫 Safe String Op: Value is ${value} - returning null`);
      return null;
    }
    
    // Force to string if not already
    const strValue = String(value);
    
    // Perform the requested operation safely
    switch(operation) {
      case 'match':
        return strValue.match(arg as RegExp);
      case 'includes':
        return strValue.includes(arg as string);
      case 'indexOf':
        return strValue.indexOf(arg as string);
      case 'startsWith':
        return strValue.startsWith(arg as string);
      default:
        return null;
    }
  } catch (error) {
    console.error(`🔥 Safe String Op Error: Failed to perform ${operation}`, error);
    // Return a safe default
    return null;
  }
}

/**
 * Safely converts a string to lowercase
 */
export const safeLowerCase = (value: any): string => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    try {
      value = String(value);
    } catch (error) {
      console.warn('Failed to convert value to string:', error);
      return '';
    }
  }
  return value.toLowerCase();
};

/**
 * Deep sanitizes an object to handle undefined/null values
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return {} as T;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize) as unknown as T;
  }
  
  // Handle objects
  const result = {} as Record<string, any>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, any>)[key];
      result[key] = deepSanitize(value);
    }
  }
  
  return result as T;
}

/**
 * Adds tracing to match method calls for debugging purposes
 */
export function traceMatchCalls(content: string): string {
  try {
    console.log('🔍 Tracing match calls on string of length:', content.length);
    return content;
  } catch (error) {
    console.error('Error in traceMatchCalls:', error);
    return content;
  }
}

/**
 * Renders a message with content formatting
 */
export function renderMessageWithContent(
  message: Message,
  figures?: Figure[],
  clauses?: ClauseContent[],
  searchResults?: SearchResult[]
): string | JSX.Element {
  // Add debug logging
  console.log('▶️ Render message with content called with:', { 
    messageContent: message?.content ? message.content.slice(0, 100) + '...' : 'undefined', 
    figuresLength: figures?.length || 0,
    clausesLength: clauses?.length || 0,
    searchResultsLength: searchResults?.length || 0
  });

  try {
    // Deep sanitize all inputs to prevent undefined errors
    const sanitizedMessage = deepSanitize(message);
    
    if (!sanitizedMessage.content) {
      console.warn('⚠️ Message content is empty or undefined');
      return "No content available";
    }

    // Use safer processing for message content and enable tracing
    const content = String(sanitizedMessage.content);
    
    // Further processing would be added here if needed
    // For now, simply return the content
    return content;
  } catch (error) {
    console.error('🚨 Error in renderMessageWithContent:', error);
    return "Error rendering content. Please check the console for details.";
  }
}

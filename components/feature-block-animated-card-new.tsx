"use client";
import React from "react";
import { CardDemo } from './CardDemo';

/**
 * FeatureBlockAnimatedCard component
 * 
 * This component has been refactored to use the CardDemo component
 * which implements the same functionality in a more maintainable way.
 */
export function FeatureBlockAnimatedCard() {
  return <CardDemo />;
}

// Export CardDemo for direct use in other components
export { CardDemo };

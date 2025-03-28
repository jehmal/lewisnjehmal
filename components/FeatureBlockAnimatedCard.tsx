"use client";
import React from "react";
import { CardDemo } from './CardDemo';

/**
 * FeatureBlockAnimatedCard component
 * 
 * This component has been refactored to use the CardDemo component
 * which implements the same functionality in a more maintainable way.
 * 
 * The original implementation has been preserved in:
 * feature-block-animated-card.tsx.full-backup
 */
export function FeatureBlockAnimatedCard() {
  return <CardDemo />;
}

// Export CardDemo for direct use in other components
export { CardDemo };

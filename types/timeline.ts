import { ReactNode } from 'react';

export interface TimelineEntry {
  title: string;
  content: ReactNode;
  onDotClick?: () => void;
  isTimelineView?: boolean;
} 
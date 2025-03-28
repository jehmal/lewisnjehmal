export interface Figure {
  name: string;
  title: string;
  image: string;
  quote: string;
  standardDoc: string;
  isFallback?: boolean;
  possiblePaths?: string[];
} 
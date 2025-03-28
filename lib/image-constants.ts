// Image path constants
export const PLACEHOLDER_IMAGE_PATH = '/images/placeholder.png';
export const FIGURES_BASE_PATH = '/All Tables & Figures';

// Helper function to get the full path for a figure
export function getFigurePath(figureName: string, standardDoc: string): string {
  return `${FIGURES_BASE_PATH}/${standardDoc}_${figureName}`;
}

// Helper function to get the placeholder path
export function getPlaceholderPath(): string {
  return PLACEHOLDER_IMAGE_PATH;
} 
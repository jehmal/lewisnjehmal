import { Figure } from '@/types/chat';

/**
 * Creates a fallback figure when an image is not available
 */
export const createFallbackFigure = (
  figureRef: string, 
  figureType: string, 
  figureNumber: string, 
  standardDoc: string
): Figure => {
  return {
    name: `${figureType} ${figureNumber}`,
    title: `Reference to ${figureType} ${figureNumber}`,
    image: '/figure-placeholder.svg',
    quote: `${figureType} ${figureNumber} from AS/NZS ${standardDoc} (Image not available)`,
    standardDoc: standardDoc,
    isFallback: true
  };
};

/**
 * Checks if an image exists and returns the figure or a fallback
 */
export const checkImageExists = async (figure: Figure): Promise<Figure> => {
  // If figure is already marked as fallback, return it as is
  if (figure.isFallback) {
    return figure;
  }

  // If figure has possiblePaths, try each one
  if (figure.possiblePaths && figure.possiblePaths.length > 0) {
    for (const path of figure.possiblePaths) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
          // Return figure with updated path
          return {
            ...figure,
            image: path
          };
        }
      } catch (error) {
        console.warn(`Failed to check image path: ${path}`, error);
      }
    }
  } else {
    // Legacy path: just check the main image path
    try {
      const response = await fetch(figure.image, { method: 'HEAD' });
      if (response.ok) {
        return figure;
      }
      
      // Try jpg if png doesn't exist
      if (figure.image.endsWith('.png')) {
        const jpgPath = figure.image.replace('.png', '.jpg');
        const jpgResponse = await fetch(jpgPath, { method: 'HEAD' });
        if (jpgResponse.ok) {
          return {
            ...figure,
            image: jpgPath
          };
        }
      }
    } catch (error) {
      console.warn(`Failed to check image path: ${figure.image}`, error);
    }
  }
  
  // If all paths failed, return a fallback figure
  // Extract type and number from the figure name
  const nameParts = figure.name.split(' ');
  if (nameParts.length >= 2) {
    const figureType = nameParts[0]; // "Figure" or "Table"
    const figureNumber = nameParts.slice(1).join(' '); // The number part
    return createFallbackFigure(figure.name, figureType, figureNumber, figure.standardDoc || '3000');
  }
  
  // If we can't parse the figure name, use a generic fallback
  return {
    ...figure,
    image: '/images/figure-placeholder.svg',
    quote: `${figure.name} (Image not available)`,
    isFallback: true
  };
};

/**
 * Sanitizes a figures array, ensuring proper format
 */
export const sanitizeFiguresArray = (figures: any): Figure[] => {
  // Return an empty array if figures is null, undefined, or not an array
  if (!figures || !Array.isArray(figures)) {
    console.log('Figures is not an array, returning empty array');
    return [];
  }
  
  // Filter out any invalid figures and add a name property if missing
  return figures.filter(fig => fig && typeof fig === 'object')
    .map(figure => ({
      ...figure,
      name: typeof figure.name === 'string' ? figure.name : 'Unknown Figure',
      standardDoc: figure.standardDoc || '3000'
    }));
};

export const DEFAULT_FIGURE: Figure = {
  name: 'Invalid Figure',
  title: 'Invalid Figure Data',
  image: '/figure-placeholder.svg',
  quote: 'This figure data was invalid',
  isFallback: true
};

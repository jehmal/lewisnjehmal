export interface ReferenceLoader {
  loadReference: (ref: string, context?: string) => Promise<any>;
}

export const referenceLoader: ReferenceLoader; 
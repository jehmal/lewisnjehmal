import { referenceLoader } from '../reference-loader';
import { ReferenceError, BaseReference } from '@/types/references';
import { standardDetector } from '../standard-detector';
import path from 'path';

// Mock the cache module
jest.mock('../reference-cache', () => {
  const cache = new Map();
  return {
    ReferenceCache: {
      getInstance: () => ({
        get: (key: any) => cache.get(JSON.stringify(key)),
        set: (key: any, value: any) => cache.set(JSON.stringify(key), value),
        clear: () => cache.clear()
      })
    }
  };
});

// Mock the standard detector
jest.mock('../standard-detector', () => ({
  standardDetector: {
    isValidStandard: (standardId: string) => standardId === '3000'
  }
}));

// Mock the clause data
const mockClauseData = {
  title: 'Test Clause',
  fullText: 'This is a test clause referencing Clause 1.2.4 and Figure 2.1'
};

const mockReferencedClauseData = {
  title: 'Referenced Clause',
  fullText: 'This is a referenced clause'
};

const mockFigureData = {
  caption: 'Test Figure',
  imagePath: '/figures/test.png'
};

const mockTableData = {
  title: 'Test Table',
  content: 'Test table content'
};

describe('ReferenceLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    const cache = require('../reference-cache').ReferenceCache.getInstance();
    cache.clear();
  });

  describe('loadReference', () => {
    it('should load a clause reference', async () => {
      // Mock the dynamic import
      jest.mock('@/components/clauses/3000-2018/1.2.3.json', () => mockClauseData, { virtual: true });

      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      const result = await referenceLoader.loadReference(ref);

      expect(result).toEqual(expect.objectContaining({
        type: 'clause',
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: 'Test Clause',
        fullText: expect.any(String)
      }));
    });

    it('should load a figure reference', async () => {
      // Mock the dynamic import
      jest.mock('@/components/clauses/3000-2018/figures/2.1.json', () => mockFigureData, { virtual: true });

      const ref = {
        type: 'figure' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '2.1',
        caption: '',
        imagePath: ''
      };

      const result = await referenceLoader.loadReference(ref);

      expect(result).toEqual(expect.objectContaining({
        type: 'figure',
        standardId: '3000',
        version: '2018',
        referenceNumber: '2.1',
        caption: 'Test Figure',
        imagePath: '/figures/test.png'
      }));
    });

    it('should load a table reference', async () => {
      // Mock the dynamic import
      jest.mock('@/components/clauses/3000-2018/tables/C.1.json', () => mockTableData, { virtual: true });

      const ref = {
        type: 'table' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: 'C.1',
        title: '',
        content: ''
      };

      const result = await referenceLoader.loadReference(ref);

      expect(result).toEqual(expect.objectContaining({
        type: 'table',
        standardId: '3000',
        version: '2018',
        referenceNumber: 'C.1',
        title: 'Test Table',
        content: 'Test table content'
      }));
    });

    it('should handle invalid standards', async () => {
      const ref = {
        type: 'clause' as const,
        standardId: '9999',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      await expect(referenceLoader.loadReference(ref)).rejects.toThrow(ReferenceError);
    });

    it('should handle missing references', async () => {
      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '9.9.9',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      await expect(referenceLoader.loadReference(ref)).rejects.toThrow(ReferenceError);
    });

    it('should respect maxDepth option for related references', async () => {
      // Mock the imports
      jest.mock('@/components/clauses/3000-2018/1.2.3.json', () => mockClauseData, { virtual: true });
      jest.mock('@/components/clauses/3000-2018/1.2.4.json', () => mockReferencedClauseData, { virtual: true });
      jest.mock('@/components/clauses/3000-2018/figures/2.1.json', () => mockFigureData, { virtual: true });

      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      const result = await referenceLoader.loadReference(ref, { maxDepth: 1 });
      expect(result.relatedReferences).toHaveLength(2); // 1.2.4 and Figure 2.1

      const noDepthResult = await referenceLoader.loadReference(ref, { maxDepth: 0 });
      expect(noDepthResult.relatedReferences).toHaveLength(0);
    });

    it('should handle timeouts', async () => {
      // Mock a slow import
      jest.mock('@/components/clauses/3000-2018/1.2.3.json', () => 
        new Promise(resolve => setTimeout(() => resolve(mockClauseData), 1000))
      , { virtual: true });

      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      await expect(
        referenceLoader.loadReference(ref, { timeout: 100 })
      ).rejects.toThrow('timed out');
    });

    it('should use cache when available', async () => {
      // Mock the import
      jest.mock('@/components/clauses/3000-2018/1.2.3.json', () => mockClauseData, { virtual: true });

      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      // First load should hit the file system
      const firstResult = await referenceLoader.loadReference(ref);
      
      // Second load should use cache
      const secondResult = await referenceLoader.loadReference(ref);
      
      expect(secondResult).toEqual(firstResult);
    });

    it('should deduplicate related references', async () => {
      // Mock the imports
      jest.mock('@/components/clauses/3000-2018/1.2.3.json', () => ({
        title: 'Test Clause',
        fullText: 'Reference to Clause 1.2.4 and Clause 1.2.4 again'
      }), { virtual: true });
      jest.mock('@/components/clauses/3000-2018/1.2.4.json', () => mockReferencedClauseData, { virtual: true });

      const ref = {
        type: 'clause' as const,
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3',
        title: '',
        fullText: '',
        relatedReferences: []
      };

      const result = await referenceLoader.loadReference(ref);
      const duplicateRefs = result.relatedReferences.filter((r: BaseReference) => 
        r.referenceNumber === '1.2.4'
      );

      expect(duplicateRefs).toHaveLength(1);
    });
  });
}); 
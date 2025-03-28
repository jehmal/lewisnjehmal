import { standardDetector } from '../standard-detector';

describe('StandardDetector', () => {
  describe('detectStandards', () => {
    it('should detect explicit standard references with version', () => {
      const text = 'This is a reference to AS/NZS 3000-2018';
      const results = standardDetector.detectStandards(text);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(expect.objectContaining({
        standardId: '3000',
        version: '2018',
        confidence: 1.0,
        metadata: expect.objectContaining({
          isExplicitReference: true,
          matchedPattern: 'AS/NZS 3000-2018'
        })
      }));
    });

    it('should detect standard references without version', () => {
      const text = 'This is a reference to AS/NZS 3000';
      const results = standardDetector.detectStandards(text);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(expect.objectContaining({
        standardId: '3000',
        version: '2018', // Should use version from STANDARD_VERSIONS
        confidence: 0.8,
        metadata: expect.objectContaining({
          isExplicitReference: true,
          matchedPattern: 'AS/NZS 3000'
        })
      }));
    });

    it('should detect ASNZS format references', () => {
      const text = 'This is a reference to ASNZS3000';
      const results = standardDetector.detectStandards(text);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(expect.objectContaining({
        standardId: '3000',
        version: '2018',
        confidence: 0.9,
        metadata: expect.objectContaining({
          isExplicitReference: true,
          matchedPattern: 'ASNZS3000'
        })
      }));
    });

    it('should enhance detection with context keywords', () => {
      const text = 'This is about medical installations';
      const results = standardDetector.detectStandards(text, ['medical', 'installations']);
      
      const medical3003 = results.find(r => r.standardId === '3003');
      expect(medical3003).toBeDefined();
      expect(medical3003).toEqual(expect.objectContaining({
        standardId: '3003',
        version: '2018',
        confidence: 0.5,
        context: ['medical'],
        metadata: expect.objectContaining({
          isExplicitReference: false,
          contextKeywords: ['medical']
        })
      }));
    });

    it('should handle multiple standards in the same text', () => {
      const text = 'Compare AS/NZS 3000-2018 with AS/NZS 3003-2018';
      const results = standardDetector.detectStandards(text);
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.standardId)).toContain('3000');
      expect(results.map(r => r.standardId)).toContain('3003');
    });

    it('should sort results by confidence', () => {
      const text = 'AS/NZS 3000-2018 and AS/NZS 3003';
      const results = standardDetector.detectStandards(text);
      
      expect(results).toHaveLength(2);
      expect(results[0].confidence).toBeGreaterThan(results[1].confidence);
    });
  });

  describe('isValidStandard', () => {
    it('should validate known standards', () => {
      expect(standardDetector.isValidStandard('3000')).toBe(true);
      expect(standardDetector.isValidStandard('9999')).toBe(false);
    });

    it('should validate standards with versions', () => {
      expect(standardDetector.isValidStandard('3000', '2018')).toBe(true);
      expect(standardDetector.isValidStandard('3000', '2019')).toBe(false);
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version for known standards', () => {
      expect(standardDetector.getLatestVersion('3000')).toBe('2018');
      expect(standardDetector.getLatestVersion('9999')).toBeUndefined();
    });
  });

  describe('getStandardsByContext', () => {
    it('should return standards for known contexts', () => {
      const medicalStandards = standardDetector.getStandardsByContext('medical');
      expect(medicalStandards).toContain('3003');
    });

    it('should return empty array for unknown contexts', () => {
      const unknownStandards = standardDetector.getStandardsByContext('unknown');
      expect(unknownStandards).toHaveLength(0);
    });
  });
}); 
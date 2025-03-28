import { ReferenceDetector } from '../reference-detector';

describe('ReferenceDetector', () => {
  let detector: ReferenceDetector;

  beforeEach(() => {
    detector = new ReferenceDetector();
  });

  describe('detectReferences', () => {
    it('should detect clause references with standard context', () => {
      const text = 'According to AS/NZS 3000-2018 Clause 1.2.3, the installation must comply with...';
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(expect.objectContaining({
        type: 'clause',
        standardId: '3000',
        version: '2018',
        referenceNumber: '1.2.3'
      }));
    });

    it('should detect multiple clause references', () => {
      const text = 'See Clauses 1.2.3, 1.2.4, and 1.2.5 of AS/NZS 3000';
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(3);
      expect(refs.map(r => r.referenceNumber)).toEqual(['1.2.3', '1.2.4', '1.2.5']);
    });

    it('should detect figure references', () => {
      const text = 'As shown in Figure 2.1 of AS/NZS 3000-2018';
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(expect.objectContaining({
        type: 'figure',
        standardId: '3000',
        version: '2018',
        referenceNumber: '2.1'
      }));
    });

    it('should detect table references', () => {
      const text = 'Refer to Table C.1 in AS/NZS 3000';
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(expect.objectContaining({
        type: 'table',
        standardId: '3000',
        referenceNumber: 'C.1'
      }));
    });

    it('should handle mixed reference types', () => {
      const text = `
        AS/NZS 3000-2018:
        - Clause 1.2.3
        - Figure 2.1
        - Table C.1
      `;
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(3);
      expect(refs.map(r => r.type)).toEqual(['clause', 'figure', 'table']);
    });

    it('should detect references with context standard', () => {
      const text = 'According to Clause 1.2.3';
      const refs = detector.detectReferences(text, '3000');

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(expect.objectContaining({
        type: 'clause',
        standardId: '3000',
        referenceNumber: '1.2.3'
      }));
    });

    it('should handle references from multiple standards', () => {
      const text = `
        AS/NZS 3000-2018 Clause 1.2.3
        AS/NZS 3003-2018 Clause 2.3.4
      `;
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(2);
      expect(refs[0].standardId).toBe('3000');
      expect(refs[1].standardId).toBe('3003');
    });

    it('should deduplicate references', () => {
      const text = `
        Clause 1.2.3
        See clause 1.2.3 again
      `;
      const refs = detector.detectReferences(text, '3000');

      expect(refs).toHaveLength(1);
    });

    it('should not detect standalone numbers as references', () => {
      const text = 'Note 1: This is a test';
      const refs = detector.detectReferences(text, '3000');

      expect(refs).toHaveLength(0);
    });

    it('should not detect years as references', () => {
      const text = 'Published in 2018';
      const refs = detector.detectReferences(text, '3000');

      expect(refs).toHaveLength(0);
    });

    it('should handle section references', () => {
      const text = 'Section 1.2.3 of AS/NZS 3000';
      const refs = detector.detectReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(expect.objectContaining({
        type: 'clause',
        standardId: '3000',
        referenceNumber: '1.2.3'
      }));
    });

    it('should detect references with context keywords', () => {
      const text = 'For medical installations, refer to Clause 2.1';
      const refs = detector.detectReferences(text);

      const medicalRefs = refs.filter(r => r.standardId === '3003');
      expect(medicalRefs).toHaveLength(1);
    });
  });
}); 
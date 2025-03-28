'use client';

import React, { useState, useEffect } from 'react';
import { ClauseLoader } from '../services/clause-loader';
import { ClauseReference } from '../types/references';

export default function TestClauseLoader() {
  const [selectedStandard, setSelectedStandard] = useState<string>('3000');
  const [selectedClause, setSelectedClause] = useState<string>('1.1');
  const [result, setResult] = useState<ClauseReference | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Get list of available standards
  const [availableStandards, setAvailableStandards] = useState<string[]>([]);

  useEffect(() => {
    // Initialize available standards
    const loader = ClauseLoader.getInstance();
    const standards = loader.getAllStandards();
    setAvailableStandards(standards);
  }, []);

  const loadClause = async () => {
    try {
      setLoading(true);
      setError(null);

      const loader = ClauseLoader.getInstance();
      const result = await loader.loadClause({
        type: 'clause',
        standard: {
          id: selectedStandard,
          name: `AS/NZS ${selectedStandard}`,
          version: '2018'
        },
        referenceNumber: selectedClause
      });

      setResult(result);
    } catch (error) {
      console.error('Error loading clause:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test Clause Loader</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Standard:</label>
        <select 
          value={selectedStandard}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStandard(e.target.value)}
          className="border p-2 rounded"
        >
          {availableStandards.map(standard => (
            <option key={standard} value={standard}>
              AS/NZS {standard}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2">Clause Number:</label>
        <input
          type="text"
          value={selectedClause}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedClause(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <button
        onClick={loadClause}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Load Clause'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error.message}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold">{result.title}</h2>
          <pre className="mt-2 whitespace-pre-wrap">{result.fullText}</pre>
        </div>
      )}
    </div>
  );
} 
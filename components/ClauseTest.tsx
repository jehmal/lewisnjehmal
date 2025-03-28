import React from 'react';
import { ClauseDisplay } from './ClauseDisplay';

/**
 * A simple component to test loading of specific clauses and subclauses
 */
export function ClauseTest() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Clause Loading Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test parent clause */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Parent Clause: 3.9.3.3</h2>
          <ClauseDisplay 
            standardId="3000"
            clauseId="3.9.3.3"
            className="bg-white dark:bg-gray-900"
            onError={(error) => console.error('Error loading parent clause:', error)}
          />
        </div>
        
        {/* Test specific subclause */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Subclause: 3.9.3.3.1</h2>
          <ClauseDisplay 
            standardId="3000"
            clauseId="3.9.3.3.1"
            className="bg-white dark:bg-gray-900"
            onError={(error) => console.error('Error loading subclause:', error)}
          />
        </div>
      </div>
      
      {/* Test comparison of clauses */}
      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Subclause Comparison Test</h2>
        <p className="mb-4">This tests whether the application correctly differentiates between parent clauses and subclauses.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-medium mb-2">Clause 3.9.3.2 (Suspended Ceilings)</h3>
            <ClauseDisplay 
              standardId="3000"
              clauseId="3.9.3.2"
              className="bg-white dark:bg-gray-900"
            />
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Referenced Clause 3.9.3.3.1 (Location)</h3>
            <ClauseDisplay 
              standardId="3000"
              clauseId="3.9.3.3.1"
              className="bg-white dark:bg-gray-900"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-auto">
          {JSON.stringify({ 
            testTime: new Date().toISOString(), 
            environment: process.env.NODE_ENV,
            standardsData: { standard: '3000', version: '2018' }
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
} 
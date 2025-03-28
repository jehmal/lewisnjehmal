/**
 * Test script for verifying 4777.1 standard clause loading
 * 
 * Run this script using:
 * npx tsx lewisnjehmal/scripts/test-4777-clauses.ts
 */

import { ClauseReference } from '../types/references';
import { clauseLoaderProvider } from '../services/clause-loader-provider';

// Import the clause loader module
import * as clauseLoaderModule from '../lib/clause-loader';

// Register the clause loader
clauseLoaderProvider.registerClauseLoader(() => clauseLoaderModule);
clauseLoaderProvider.enableDebug(true);

// Define a list of clauses to test
const testClauses = [
  { id: '2.3', standard: '4777.1-2016' },
  { id: '3.1', standard: '4777.1-2016' },
  { id: '3.4.4.1', standard: '4777.1-2016' },
  { id: '5.3.1', standard: '4777.1-2016' },
  { id: '7.4', standard: '4777.1' },  // Using shortened standard ID
  { id: '7.6', standard: '4777' },    // Using base standard ID
  { id: '3.1', standard: 'AS/NZS 4777.1-2016' }, // Using formal standard notation
];

// Test loading each clause
async function testClauseLoading() {
  console.log('Testing 4777.1 standard clause loading...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const test of testClauses) {
    console.log(`Testing clause ${test.id} from standard ${test.standard}`);
    
    try {
      // Create a reference object
      const reference: ClauseReference = {
        id: `${test.standard}_${test.id}`,
        type: 'clause',
        referenceNumber: test.id,
        standard: {
          id: test.standard,
          name: `AS/NZS ${test.standard}`,
          version: test.standard.includes('-') ? test.standard.split('-')[1] : '2016'
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'direct',
        validated: false,
        referenceChain: [test.id]
      };
      
      // Try to load the clause
      const result = await clauseLoaderModule.loadClause(reference);
      
      // Log success
      console.log(`✅ Success: ${result.title}`);
      console.log(`   Full text length: ${result.fullText?.length || 0} characters`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      failCount++;
    }
    
    console.log('-'.repeat(60));
  }
  
  // Summary
  console.log(`\nTest Summary:`);
  console.log(`${successCount} successful, ${failCount} failed\n`);
  
  // Check if any supported standards are available
  console.log('Checking standard support:');
  const standardsToCheck = ['4777.1', '4777', '4777.1-2016', 'AS/NZS 4777.1-2016', '3000', '3001.1'];
  
  standardsToCheck.forEach(standardId => {
    const isSupported = clauseLoaderProvider.isStandardSupported(standardId);
    console.log(`Standard ${standardId}: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
  });
}

// Run the tests
testClauseLoading().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 
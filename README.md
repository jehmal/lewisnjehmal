# TradeGuru - Australian Electrical Standards AI Assistant

## Overview

TradeGuru is an advanced AI-powered application designed specifically for electrical professionals in Australia and New Zealand. It provides intelligent access to electrical standards and regulations through natural language processing and advanced search capabilities.

## Core Features

### 1. Standards Integration
- Comprehensive coverage of Australian/New Zealand Electrical Standards
- Includes multiple standard books:
  - AS/NZS 3000:2018 (Wiring Rules)
  - AS/NZS 3004.2:2014 (Boats and Marinas)
  - AS/NZS 3012:2019 (Construction Sites)
  - AS/NZS 3017:2022 (Testing and Inspection)
  - And many more...

### 2. AI-Powered Question Answering
- Natural language query processing
- Context-aware responses
- Multi-standard cross-referencing
- Automatic clause reference detection
- Support for follow-up questions

### 3. Technical Features
- Real-time clause reference linking
- Interactive clause display
- Figure and table visualization
- Cross-standard search capabilities
- Jurisdiction-specific responses (WA, National)

### 4. Professional Tools
- Maximum Demand Calculator
- Cable Size Calculator
- Additional electrical calculation tools
- Standards-compliant documentation

## Technical Architecture

### Frontend
- Built with Next.js 14
- TypeScript for type safety
- Responsive design with Tailwind CSS
- Dark/light mode support

### Backend
- OpenAI API integration
- Supabase for data storage
- Vector search capabilities
- Real-time updates

### Standards Processing
- JSON-structured electrical standards
- Hierarchical clause organization
- Metadata-enhanced search
- Cross-reference management

## Getting Started

### Prerequisites
```bash
Node.js 18.0.0 or later
npm or yarn
Supabase account
OpenAI API key
```

### Installation
1. Clone the repository:
```bash
git clone https://github.com/yourusername/TradeGuru.git
cd TradeGuru
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your credentials:
```
OPENAI_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

## Data Structure

### Standards Organization
```
components/
  └── clauses/
      ├── 3004.2-2014/
      ├── 3012-2019/
      ├── 3017-2022/
      └── ...
```

### Clause Format
```json
{
  "id": "clause_id",
  "title": "Clause Title",
  "fullText": "Complete clause text",

}
```

## AI Integration

### Query Processing
1. User submits question
2. System analyzes for:
   - Standard references
   - Technical terms
   - Jurisdiction context
3. AI generates response with:
   - Relevant clause references
   - Cross-standard citations
   - Figures and tables
   - Follow-up capabilities

### Response Generation
- Context-aware answers
- Multiple standard integration
- Clause reference linking
- Figure/table inclusion
- Jurisdiction consideration

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact [support@tradeguru.com](mailto:support@tradeguru.com)

## Acknowledgments

- Australian Standards (AS)
- Standards New Zealand (NZS)
- Western Australian Electrical Requirements (WAER)

---

Built with ❤️ for Australian Electrical Professionals

# Clause Reference System

This project implements a robust system for loading and displaying electrical standard clauses from various standards.

## Architecture

The system is built around the following components:

1. **ClauseLoader** (`clause-loader.ts`)
   - Responsible for loading clause data from various sources
   - Implements multi-strategy loading approach
   - Contains hardcoded data for problematic clauses
   - Provides standardized output format

2. **ClauseDisplay** (`ClauseDisplay.tsx`)
   - React component for displaying clauses
   - Handles various reference formats
   - Provides error handling and fallbacks
   - Renders clauses with proper formatting

3. **ReferenceDetector** (`reference-detector.ts`)
   - Identifies and extracts references from text
   - Supports multiple reference formats
   - Provides context-aware detection

4. **Test Page** (`test-clause-loader.tsx`)
   - Provides a UI for testing the clause loader
   - Allows trying different standards and clauses
   - Shows available standards and presets

## Standards Registry

The system includes a comprehensive registry of electrical standards:

- AS/NZS 3000:2018 (Wiring Rules)
- AS/NZS 2293.2:2019 (Emergency lighting and exit signs)
- AS/NZS 3003:2018 (Electrical installations - Patient areas)
- AS/NZS 3001.1:2022 (Transportable structures and vehicles - Part 1)
- AS/NZS 3001.2:2022 (Transportable structures and vehicles - Part 2)
- And many more...

## Features

1. **Multi-Strategy Clause Loading**
   - Direct dynamic imports from JSON files
   - Underscore and dot format support
   - Hardcoded fallbacks for problematic clauses
   - Caching for improved performance

2. **Intelligent Reference Detection**
   - Supports various reference formats (e.g., "ASNZS3000 Clause 2.1")
   - Pattern-based standard detection
   - Context-aware reference resolution

3. **Robust Error Handling**
   - Graceful fallbacks for missing clauses
   - Special case handling for known issues
   - Clear error messages

4. **Extensible Architecture**
   - Support for future addition of figures and tables
   - Standard-agnostic design
   - Consistent interface across reference types

## Usage

```tsx
// Import the ClauseLoader
import { clauseLoader } from '@/services/clause-loader';

// Load a clause using a string reference
const clause = await clauseLoader.loadClause('ASNZS3000 Clause 2.1');

// Load a clause using a reference object
const clause = await clauseLoader.loadClause({
  id: '2.5.2',
  referenceNumber: '2.5.2',
  type: 'clause',
  standard: {
    id: '2293.2',
    name: 'Emergency lighting and exit signs',
    version: '2019'
  },
  // ... other required properties
});

// Display a clause
<ClauseDisplay standardId="2293.2" clauseId="2.5.2" />
```

## Future Enhancements

1. Scanning the file system to build a comprehensive map of available clauses
2. Adding support for figures and tables
3. Enhancing the detection of cross-references between standards
4. Implementing a validation system for references
5. Providing a visualization of related references

# TradeGuru Electrical Standards System

## Clause Loading System Documentation

### Overview
The TradeGuru system provides access to electrical standards documentation in a structured format. The system dynamically loads clauses from multiple electrical standards books located in the `components/clauses` directory.

### Directory Structure
Standards are organized in the following structure:
```
components/clauses/
  ├── 3000.1-2018/
  │   ├── 1.1.json
  │   ├── 1.2.json
  │   └── ...
  ├── 3012-2019/
  │   ├── 1.1.json
  │   ├── 1.2.json
  │   └── ...
  └── [standard-version]/
      ├── [clause-id].json
      └── ...
```

Each standard has its own directory named in the format `[standard-ID]-[year]`. Within each directory, clause files are stored as JSON files named according to their clause ID.

### Clause JSON Format
Each clause JSON file follows this structure:
```json
{
  "id": "1.1.2.1",
  "title": "The clause title exactly as written",
  "fullText": "The complete text of the clause, word-for-word"
}
```

### Accessing Clauses
The system provides several ways to access clauses:

1. **Clause Loader Service**
   - Main service: `services/clause-loader.ts`
   - Function: `loadClauseFromStandard(standardId, clauseId)`

2. **Components for Displaying Clauses**
   - Main component: `components/ClauseDisplay.tsx`
   - Referenced clauses: `components/ReferencedClausesSection.tsx`

### Testing Clause Loading
To verify that all standard clauses can be loaded correctly:
```
npm run test-clauses
```

This command runs the utility script at `utils/test-clause-loading.ts` which:
1. Verifies all standard directories exist
2. Counts JSON files in each directory
3. Tests loading sample clauses from each standard
4. Generates a detailed report of results

### Adding New Standards
When adding a new standard:
1. Create a directory in `components/clauses/` named according to the standard ID and version
2. Add JSON files for each clause following the specified format
3. Run the test command to verify loading works correctly

### Technical Implementation Details
- The system uses dynamic imports to load clause data
- Clause data is cached after first load for better performance
- Error handling is implemented for missing or malformed clauses
- Fallback mechanisms attempt to load from index files when direct imports fail

For any issues with the clause loading system, please refer to the logs which include detailed information about loading attempts and failures.
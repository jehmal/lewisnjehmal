#!/usr/bin/env python3
import os
import json
import re
import sys
from collections import defaultdict

def scan_clauses_for_figures_tables():
    # Base directory for clauses
    base_dir = os.path.join("lewisnjehmal", "components", "clauses")
    
    # Results will be stored in this structure:
    # {
    #   "standard_id": {
    #       "figures": {"figure_number": ["clause_id1", "clause_id2", ...]},
    #       "tables": {"table_number": ["clause_id1", "clause_id2", ...]}
    #   }
    # }
    results = {}
    
    # Regular expressions to find figures and tables
    figure_pattern = re.compile(r'[Ff]igure\s+(\d+(?:\.\d+)*)', re.IGNORECASE)
    table_pattern = re.compile(r'[Tt]able\s+(\d+(?:\.\d+)*)', re.IGNORECASE)
    
    # Get list of standards (subdirectories)
    standard_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    
    for standard_id in standard_dirs:
        standard_path = os.path.join(base_dir, standard_id)
        
        # Skip if not a directory
        if not os.path.isdir(standard_path):
            continue
        
        # Initialize results for this standard
        results[standard_id] = {
            "figures": defaultdict(list),
            "tables": defaultdict(list)
        }
        
        # Get list of JSON files in this standard directory
        json_files = [f for f in os.listdir(standard_path) if f.endswith('.json') and f != 'index.ts']
        
        for json_file in json_files:
            clause_id = os.path.splitext(json_file)[0]
            file_path = os.path.join(standard_path, json_file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    clause_data = json.load(f)
                
                # Check if the file has the expected structure
                if "fullText" in clause_data:
                    full_text = clause_data["fullText"]
                    
                    # Find all figures referenced in the text
                    figure_matches = figure_pattern.findall(full_text)
                    for figure_num in figure_matches:
                        results[standard_id]["figures"][figure_num].append(clause_id)
                    
                    # Find all tables referenced in the text
                    table_matches = table_pattern.findall(full_text)
                    for table_num in table_matches:
                        results[standard_id]["tables"][table_num].append(clause_id)
            
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}", file=sys.stderr)
    
    return results

def generate_report(results):
    """Generate a human-readable report from the scan results"""
    report = []
    
    for standard_id, data in sorted(results.items()):
        standard_name = get_standard_name(standard_id)
        report.append(f"\n{'=' * 80}")
        report.append(f"Standard: {standard_name} ({standard_id})")
        report.append(f"{'=' * 80}")
        
        # Report on figures
        if data["figures"]:
            report.append("\nFIGURES:")
            report.append("-" * 40)
            
            for figure_num, clauses in sorted(data["figures"].items(), key=lambda x: natural_sort_key(x[0])):
                report.append(f"Figure {figure_num} is referenced in:")
                for clause_id in sorted(clauses, key=natural_sort_key):
                    report.append(f"  - Clause {clause_id}")
            
        # Report on tables
        if data["tables"]:
            report.append("\nTABLES:")
            report.append("-" * 40)
            
            for table_num, clauses in sorted(data["tables"].items(), key=lambda x: natural_sort_key(x[0])):
                report.append(f"Table {table_num} is referenced in:")
                for clause_id in sorted(clauses, key=natural_sort_key):
                    report.append(f"  - Clause {clause_id}")
    
    return "\n".join(report)

def get_standard_name(standard_id):
    """Convert standard ID to a more readable format"""
    # Map of standard IDs to their names
    standard_names = {
        "3000-2018": "AS/NZS 3000:2018 (Wiring Rules)",
        "3001.1-2022": "AS/NZS 3001.1:2022",
        "3001.2-2022": "AS/NZS 3001.2:2022",
        "3003-2018": "AS/NZS 3003:2018",
        "3004.2-2014": "AS/NZS 3004.2:2014",
        "3010-2017": "AS/NZS 3010:2017",
        "3012-2019": "AS/NZS 3012:2019",
        "3017-2022": "AS/NZS 3017:2022",
        "3019-2022": "AS/NZS 3019:2022",
        "3760-2022": "AS/NZS 3760:2022",
        "3820-2009": "AS/NZS 3820:2009",
        "4509.1-2009": "AS/NZS 4509.1:2009",
        "4509.2-2010": "AS/NZS 4509.2:2010",
        "4777.1-2016": "AS/NZS 4777.1:2016",
        "4836-2023": "AS/NZS 4836:2023",
        "5033-2021": "AS/NZS 5033:2021",
        "5139-2019": "AS/NZS 5139:2019",
        "2293.2-2019": "AS/NZS 2293.2:2019"
    }
    
    return standard_names.get(standard_id, f"AS/NZS {standard_id}")

def natural_sort_key(s):
    """
    Return a key that can be used for natural sorting
    For example: 1.1, 1.2, 1.10 (instead of 1.1, 1.10, 1.2)
    """
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', str(s))]

def save_report(content, filename="figure_table_references.txt"):
    """Save the report to a text file"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Report saved to {filename}")

def main():
    print("Scanning clause files for figure and table references...")
    results = scan_clauses_for_figures_tables()
    
    report = generate_report(results)
    save_report(report)
    
    # Also print a summary
    total_figures = sum(len(data["figures"]) for data in results.values())
    total_tables = sum(len(data["tables"]) for data in results.values())
    total_standards = len(results)
    
    print(f"\nSummary:")
    print(f"- Scanned {total_standards} standards")
    print(f"- Found {total_figures} unique figures referenced")
    print(f"- Found {total_tables} unique tables referenced")
    print("\nSee figure_table_references.txt for the full report.")

if __name__ == "__main__":
    main()
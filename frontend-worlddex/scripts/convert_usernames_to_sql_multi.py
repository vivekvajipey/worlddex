#!/usr/bin/env python3
"""
Convert multiple username text files to SQL INSERT statements, ensuring uniqueness.
Usage: python convert_usernames_to_sql_multi.py output.sql file1.txt file2.txt ...
   Or: python convert_usernames_to_sql_multi.py output.sql *.txt
"""

import sys
import os
import glob

def convert_to_sql(input_files, output_file):
    try:
        all_usernames = set()
        file_count = 0
        
        # Process each input file
        for pattern in input_files:
            # Handle wildcards
            files = glob.glob(pattern)
            if not files:
                print(f"Warning: No files found matching '{pattern}'")
                continue
                
            for input_file in files:
                print(f"Processing {input_file}...")
                with open(input_file, 'r') as f:
                    usernames = [line.strip() for line in f if line.strip()]
                    before_count = len(all_usernames)
                    all_usernames.update(usernames)
                    added_count = len(all_usernames) - before_count
                    print(f"  - Found {len(usernames)} names, {added_count} new unique")
                file_count += 1
        
        if not all_usernames:
            print("Error: No usernames found in any file")
            sys.exit(1)
            
        # Convert to sorted list for consistent output
        unique_usernames = sorted(list(all_usernames))
        
        print(f"\nTotal unique usernames across {file_count} files: {len(unique_usernames)}")
        
        # Write SQL statements
        with open(output_file, 'w') as f:
            # Write header comment
            f.write("-- Generated SQL to insert usernames into username_pool table\n")
            f.write(f"-- Total unique usernames: {len(unique_usernames)}\n")
            f.write(f"-- Source files: {', '.join(input_files)}\n\n")
            
            # Note about duplicates
            f.write("-- This query uses ON CONFLICT DO NOTHING to skip any usernames\n")
            f.write("-- that already exist in the database (like from grok_names.txt)\n\n")
            
            # Write INSERT statements in batches of 500 for better performance
            batch_size = 500
            for i in range(0, len(unique_usernames), batch_size):
                batch = unique_usernames[i:i + batch_size]
                
                f.write("INSERT INTO username_pool (username) VALUES\n")
                
                # Write each username
                for j, username in enumerate(batch):
                    # Escape single quotes in usernames
                    escaped_username = username.replace("'", "''")
                    
                    if j < len(batch) - 1:
                        f.write(f"  ('{escaped_username}'),\n")
                    else:
                        f.write(f"  ('{escaped_username}')\n")
                
                f.write("ON CONFLICT (username) DO NOTHING;\n\n")
        
        print(f"\nSuccessfully created {output_file}")
        print(f"You can now copy the contents and run it in Supabase SQL editor")
        print(f"Note: Any duplicates with existing data will be automatically skipped")
        
    except FileNotFoundError as e:
        print(f"Error: Could not find file - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_usernames_to_sql_multi.py output.sql file1.txt file2.txt ...")
        print("   Or: python convert_usernames_to_sql_multi.py output.sql *.txt")
        print("\nExample: python convert_usernames_to_sql_multi.py all_names.sql claude_names.txt grok_names.txt")
        print("         python convert_usernames_to_sql_multi.py all_names.sql *.txt")
        sys.exit(1)
    
    output_file = sys.argv[1]
    input_files = sys.argv[2:]
    
    convert_to_sql(input_files, output_file)

if __name__ == "__main__":
    main()
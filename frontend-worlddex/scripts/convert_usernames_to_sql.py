#!/usr/bin/env python3
"""
Convert a text file with usernames (one per line) to SQL INSERT statements.
Usage: python convert_usernames_to_sql.py input.txt output.sql
"""

import sys
import os

def convert_to_sql(input_file, output_file):
    try:
        # Read all usernames from the input file
        with open(input_file, 'r') as f:
            usernames = [line.strip() for line in f if line.strip()]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_usernames = []
        for name in usernames:
            if name not in seen:
                seen.add(name)
                unique_usernames.append(name)
        
        print(f"Found {len(unique_usernames)} unique usernames")
        
        # Write SQL statements
        with open(output_file, 'w') as f:
            # Write header comment
            f.write("-- Generated SQL to insert usernames into username_pool table\n")
            f.write(f"-- Total usernames: {len(unique_usernames)}\n\n")
            
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
        
        print(f"Successfully created {output_file}")
        print(f"You can now copy the contents and run it in Supabase SQL editor")
        
    except FileNotFoundError:
        print(f"Error: Could not find file '{input_file}'")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert_usernames_to_sql.py input.txt output.sql")
        print("Example: python convert_usernames_to_sql.py usernames.txt insert_usernames.sql")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    convert_to_sql(input_file, output_file)

if __name__ == "__main__":
    main()
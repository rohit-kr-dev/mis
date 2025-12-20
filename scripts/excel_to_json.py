"""
Excel to JSON Converter for Material MIS

This script reads the main working sheet from the Excel file and converts it to JSON format.
It's designed to handle large datasets and can be rerun whenever new rows are added.

Usage:
    python excel_to_json.py

Requirements:
    pip install pandas openpyxl
"""

import pandas as pd
import json
from datetime import datetime
import os

# Configuration
EXCEL_FILE = "Material_Upliftment_MIS.xlsx"
SHEET_NAME = "<< Working >>"
HEADER_ROW = 1  # 0-based index (row 2 in Excel)
OUTPUT_JSON = "working_sheet_data.json"

def convert_excel_to_json():
    """
    Convert the main working sheet from Excel to JSON format.
    """
    try:
        # Check if Excel file exists
        if not os.path.exists(EXCEL_FILE):
            raise FileNotFoundError(f"Excel file not found: {EXCEL_FILE}")
        
        print(f"Reading Excel file: {EXCEL_FILE}")
        print(f"Target sheet: {SHEET_NAME}")
        
        # Read the specific sheet with the correct header row
        df = pd.read_excel(
            EXCEL_FILE,
            sheet_name=SHEET_NAME,
            header=HEADER_ROW
        )
        
        # Remove completely empty rows
        df = df.dropna(how="all")
        
        # Convert date columns to string format if needed
        date_columns = ['Purchase Date', 'Date for CN']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%Y-%m-%d')
        
        # Convert DataFrame to JSON
        json_data = df.to_json(
            OUTPUT_JSON,
            orient="records",
            indent=2,
            date_format='iso',
            force_ascii=False
        )
        
        # Add metadata
        metadata = {
            "conversion_timestamp": datetime.now().isoformat(),
            "total_records": len(df),
            "sheet_name": SHEET_NAME
        }
        
        # Read the JSON file and add metadata
        with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Wrap data with metadata
        wrapped_data = {
            "metadata": metadata,
            "data": data
        }
        
        # Write the final JSON with metadata
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(wrapped_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully converted {len(df)} records to JSON")
        print(f"📁 Output saved to: {OUTPUT_JSON}")
        print(f"🕒 Conversion timestamp: {metadata['conversion_timestamp']}")
        
        # Show first record as sample
        if len(data) > 0:
            print("\n📋 Sample record:")
            print(json.dumps(data[0], indent=2, default=str))
            
    except Exception as e:
        print(f"❌ Error converting Excel to JSON: {str(e)}")
        raise

def convert_latest_rows_only(limit=100):
    """
    Convert only the latest N rows to JSON (useful for incremental updates).
    
    Args:
        limit (int): Number of latest rows to convert
    """
    try:
        # Read the specific sheet with the correct header row
        df = pd.read_excel(
            EXCEL_FILE,
            sheet_name=SHEET_NAME,
            header=HEADER_ROW
        )
        
        # Remove completely empty rows
        df = df.dropna(how="all")
        
        # Get only the latest rows
        latest_df = df.tail(limit)
        
        # Convert date columns to string format if needed
        date_columns = ['Purchase Date', 'Date for CN']
        for col in date_columns:
            if col in latest_df.columns:
                latest_df[col] = pd.to_datetime(latest_df[col], errors='coerce').dt.strftime('%Y-%m-%d')
        
        # Save to separate file
        output_file = f"latest_{limit}_rows.json"
        latest_df.to_json(
            output_file,
            orient="records",
            indent=2,
            date_format='iso',
            force_ascii=False
        )
        
        print(f"✅ Successfully converted latest {len(latest_df)} records to JSON")
        print(f"📁 Output saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Error converting latest rows: {str(e)}")
        raise

if __name__ == "__main__":
    print("🚀 Starting Excel to JSON conversion...")
    convert_excel_to_json()
    
    # Optionally, also create a file with latest rows only
    # convert_latest_rows_only(100)
    
    print("✨ Conversion process completed!")
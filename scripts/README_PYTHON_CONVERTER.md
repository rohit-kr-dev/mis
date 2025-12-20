# Excel to JSON Converter for Material MIS

This Python script converts the main working sheet from the Excel file to JSON format. It's designed specifically for handling large datasets (1300+ rows) and can be rerun whenever new rows are added.

## Features

- ✅ Reads only the main working sheet (`<< Working >>`)
- ✅ Handles 1300+ rows easily
- ✅ Can be rerun anytime when new rows are added
- ✅ Safe for large and growing data
- ✅ Preserves date formatting
- ✅ Includes metadata (timestamp, record count)

## Prerequisites

Install the required Python libraries:

```bash
pip install pandas openpyxl
```

## Usage

### Method 1: Command Line

```bash
cd scripts
python excel_to_json.py
```

### Method 2: Batch File (Windows)

Double-click on `convert_working_sheet.bat` or run from command line:

```bash
cd scripts
convert_working_sheet.bat
```

## Output

The script generates `working_sheet_data.json` with the following structure:

```json
{
  "metadata": {
    "conversion_timestamp": "2025-12-19T12:31:43.848429",
    "total_records": 1232,
    "sheet_name": "<< Working >>"
  },
  "data": [
    {
      "Sr. No.": 1,
      "Category": "Purchase",
      "PSPL Branch": "Bangalore WH",
      "Supplier": "PARAGON RESIN LLP",
      // ... other fields
    }
    // ... more records
  ]
}
```

## Advanced Options

### Convert Only Latest Rows

To convert only the latest N rows (useful for incremental updates), uncomment the relevant line in the script:

```python
# Optionally, also create a file with latest rows only
convert_latest_rows_only(100)
```

Or call the function directly with your desired limit:

```python
convert_latest_rows_only(50)  # Last 50 rows only
```

## Automation

### Scheduled Updates

To automatically run the conversion every day at a specific time:

1. Open Task Scheduler (taskschd.msc)
2. Create a new task
3. Set trigger to daily at your preferred time
4. Set action to run `convert_working_sheet.bat`

### File Watcher (Advanced)

For automatic conversion when the Excel file is updated, you can use a file watcher script:

```python
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Implementation would monitor the Excel file and run conversion on changes
```

## Troubleshooting

### ImportError: No module named pandas

Install the required packages:

```bash
pip install pandas openpyxl
```

### FileNotFoundError: [Errno 2] No such file or directory

Ensure the Excel file `Material_Upliftment_MIS.xlsx` is in the `scripts` directory.

### Date Parsing Issues

The script automatically handles date columns "Purchase Date" and "Date for CN". If you have other date columns, add them to the `date_columns` list in the script.

## Customization

### Changing Target Sheet

Modify these constants in the script:

```python
EXCEL_FILE = "Material_Upliftment_MIS.xlsx"
SHEET_NAME = "<< Working >>"
HEADER_ROW = 1  # 0-based index (row 2 in Excel)
OUTPUT_JSON = "working_sheet_data.json"
```

### Adding More Date Columns

Add column names to the `date_columns` list:

```python
date_columns = ['Purchase Date', 'Date for CN', 'Your Date Column']
```
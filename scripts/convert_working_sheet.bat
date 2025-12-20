@echo off
echo 🚀 Converting Excel Working Sheet to JSON...
echo.

cd /d "C:\Users\psplt\OneDrive\Documents\project\material-mis\scripts"

python excel_to_json.py

echo.
echo ✅ Conversion completed!
echo 📁 Check the working_sheet_data.json file for output
pause
import pandas as pd

# Read the CSV file
df = pd.read_csv('sample-data.csv')

# Save as Excel file
df.to_excel('sample-data.xlsx', index=False)

print("Sample Excel file 'sample-data.xlsx' created successfully!")
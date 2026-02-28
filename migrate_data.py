import pandas as pd
import numpy as np
import os

def migrate_data():
    input_file = "Expenses 26.xlsx"
    output_file = "historical_data.csv"
    
    print(f"Reading {input_file}...")
    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"Error reading excel file: {e}")
        return

    # Select necessary columns based on previous inspection
    # The columns in the Excel file are: 
    # 'Date', 'Expense', 'Category', 'Remarks', 'Home Pay?', 'Michigan pay?'
    
    columns_mapping = {
        'Date': 'Date',
        'Expense': 'Amount',
        'Category': 'Category',
        'Home Pay?': 'Home Pay',
        'Michigan pay?': 'Michigan Pay',
        'Remarks': 'Remarks'
    }
    
    try:
        df_clean = df[list(columns_mapping.keys())].copy()
    except KeyError as e:
        print(f"Missing expected columns in the Excel sheet: {e}")
        return
        
    df_clean.rename(columns=columns_mapping, inplace=True)
    
    # Drop rows where Date or Expense is extremely null
    df_clean.dropna(subset=['Date', 'Amount'], how='all', inplace=True)
    
    # Format the Date
    df_clean['Date'] = pd.to_datetime(df_clean['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    df_clean.dropna(subset=['Date'], inplace=True)
    
    # Clean Amount
    df_clean['Amount'] = pd.to_numeric(df_clean['Amount'], errors='coerce').fillna(0).round(2)
    
    # Fill NA for Category
    df_clean['Category'] = df_clean['Category'].fillna('Uncategorized').astype(str)
    
    # Format Booleans (True -> TRUE, False -> FALSE, NaNs -> FALSE)
    for col in ['Home Pay', 'Michigan Pay']:
        df_clean[col] = df_clean[col].fillna(False).astype(bool).map({True: 'TRUE', False: 'FALSE'})
        
    # Format Remarks
    df_clean['Remarks'] = df_clean['Remarks'].fillna('').astype(str)
    
    # Save to CSV
    df_clean.to_csv(output_file, index=False)
    print(f"\nMigration successful! Data saved to {os.path.abspath(output_file)}")
    print(f"Total rows successfully formatted: {len(df_clean)}")
    print("\nYou can now open this CSV and paste its contents directly into the 'Raw Data' tab of your new Google Sheet.")

if __name__ == "__main__":
    migrate_data()

// Replace this with the actual Spreadsheet ID from the URL of the Google Sheet
export const SPREADSHEET_ID = "1ooe6TFyX5sbqqLctsmUgrr-PjBWvRnwyNg-chreJMCI";

// Replace with the exact names of the tabs in your Google Sheet
export const RAW_LOG_RANGE = "Raw Data!A:F";
export const SETTINGS_RANGE = "Settings!A:B";

export interface Transaction {
    rowNumber?: number;
    date: string;
    amount: number;
    category: string;
    isHomePay: boolean;
    isMichiganPay: boolean;
    remarks: string;
}

export interface Settings {
    mileageReimbursementRate: number;
    mileageTaxDeductionRate: number;
}

/**
 * Fetches the raw transactions from the Google Sheet
 */
export async function fetchTransactions(accessToken: string): Promise<Transaction[]> {
    if (!SPREADSHEET_ID) {
        console.warn("Spreadsheet ID not configured.");
        return [];
    }

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RAW_LOG_RANGE}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Error fetching transactions: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Assuming row 1 is headers: Date, Amount, Category, Home Pay, Michigan Pay, Remarks
    return rows.slice(1).map((row: any[], index: number) => ({
        rowNumber: index + 2, // Sheet rows are 1-indexed, and row 1 is headers
        date: row[0] || "",
        amount: parseFloat(row[1]?.replace(/[$,]/g, "") || "0"),
        category: row[2] || "Uncategorized",
        isHomePay: row[3] === "TRUE" || row[3] === "Yes",
        isMichiganPay: row[4] === "TRUE" || row[4] === "Yes",
        remarks: row[5] || "",
    }));
}

/**
 * Appends a new transaction to the Google Sheet
 */
export async function appendTransaction(accessToken: string, transaction: Transaction) {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID not configured.");
    }

    const rowData = [
        transaction.date,
        transaction.amount.toString(),
        transaction.category,
        transaction.isHomePay ? "TRUE" : "FALSE",
        transaction.isMichiganPay ? "TRUE" : "FALSE",
        transaction.remarks,
    ];

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RAW_LOG_RANGE}:append?valueInputOption=USER_ENTERED`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                values: [rowData],
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Error appending transaction: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Updates an existing transaction in the Google Sheet by its row number
 */
export async function updateTransaction(accessToken: string, rowNumber: number, transaction: Transaction) {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID not configured.");
    }

    const rowData = [
        transaction.date,
        transaction.amount.toString(),
        transaction.category,
        transaction.isHomePay ? "TRUE" : "FALSE",
        transaction.isMichiganPay ? "TRUE" : "FALSE",
        transaction.remarks,
    ];

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Raw Data!A${rowNumber}:F${rowNumber}?valueInputOption=USER_ENTERED`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                values: [rowData],
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Error updating transaction: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Deletes a transaction from the Google Sheet by clearing its row
 */
export async function deleteTransaction(accessToken: string, rowNumber: number) {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID not configured.");
    }

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Raw Data!A${rowNumber}:F${rowNumber}:clear`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Error deleting transaction: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Fetches the user settings from the Settings tab
 */
export async function fetchSettings(accessToken: string): Promise<Settings> {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID not configured.");
    }

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SETTINGS_RANGE}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Error fetching settings: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Default fallback values if sheet is empty or missing
    const settings: Settings = {
        mileageReimbursementRate: 0.55,
        mileageTaxDeductionRate: 0.15,
    };

    // Parse Key-Value pairs from the Settings!A:B tab
    rows.forEach((row: any[]) => {
        const key = row[0];
        const val = parseFloat(row[1]);
        if (key === 'MileageReimbursementRate' && !isNaN(val)) settings.mileageReimbursementRate = val;
        if (key === 'MileageTaxDeductionRate' && !isNaN(val)) settings.mileageTaxDeductionRate = val;
    });

    return settings;
}

/**
 * Updates the configurations by overwriting the Settings!A:B tab
 */
export async function updateSettings(accessToken: string, settings: Settings) {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID not configured.");
    }

    // Convert settings object to a 2D array for Google Sheets
    const values = [
        ['MileageReimbursementRate', settings.mileageReimbursementRate],
        ['MileageTaxDeductionRate', settings.mileageTaxDeductionRate]
    ];

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SETTINGS_RANGE}?valueInputOption=USER_ENTERED`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                values: values,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Error updating settings: ${response.statusText}`);
    }

    return await response.json();
}

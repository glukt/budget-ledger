// Replace this with the actual Spreadsheet ID from the URL of the Google Sheet
export const SPREADSHEET_ID = "1ooe6TFyX5sbqqLctsmUgrr-PjBWvRnwyNg-chreJMCI";

// Replace with the exact names of the tabs in your Google Sheet
export const RAW_LOG_RANGE = "Raw Data!A:F";
export const SETTINGS_RANGE = "Settings!A:B";

export interface Transaction {
    date: string;
    amount: number;
    category: string;
    isHomePay: boolean;
    isMichiganPay: boolean;
    remarks: string;
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
    return rows.slice(1).map((row: any[]) => ({
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

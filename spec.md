Project Specification: Single-Tenant Financial Ledger & Tax Export Application
1. System Architecture & Tech Stack

The application will utilize a modern, lightweight, three-tier serverless architecture optimized for secure, single-tenant deployment and mobile-first data entry.

    Framework: Next.js (App Router) for unified frontend and backend logic, heavily utilizing React Server Components (RSCs) and Server Actions.

    Database: Serverless PostgreSQL (e.g., Neon or Supabase) to ensure persistence across Vercel deployments.

    ORM: Prisma ORM for strict type safety, schema migrations, and relational integrity.

    Authentication: NextAuth.js (Auth.js) using the Google Provider, configured with an environment variable allowlist for strict single-user access.

    Styling: Tailwind CSS, enforcing a mobile-first responsive design paradigm.

    Export Utilities: react-csv or native Node.js stream parsing for generating the CPA-ready summary files.

2. Database Schema (Prisma)

The flat-file Excel structure must be normalized into a relational schema to prevent user-generated data corruption and enforce strict financial categories.
Code snippet

// schema.prisma
datasource db {
  provider = "postgresql" 
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Transaction {
  id              String   @id @default(uuid())
  date            DateTime
  amount          Float
  remarks         String?
  
  // Dimensional Flags (previously Excel columns)
  isHomePay       Boolean  @default(false)
  isMichiganPay   Boolean  @default(false)
  
  // Relational Integrity
  categoryId      String
  category        Category @relation(fields: [categoryId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Category {
  id              String        @id @default(uuid())
  name            String        @unique // e.g., "Mileage", "Deposit", "Liability Insurance"
  type            CategoryType  // Enum: INCOME, EXPENSE
  taxDeductible   Boolean       @default(true) // Flag for the tax export engine
  transactions    Transaction[]
}

enum CategoryType {
  INCOME
  EXPENSE
}

3. Core Modules & Server Actions
Module A: Mobile-First Data Entry (The Ledger)

The primary interaction point. The UI must be optimized for thumb-reachability on mobile devices.

    Implementation: A React Server Component housing a Client Component form.

    Validation: Zod schema validation must wrap the form submission to ensure amount is a valid float and date is a valid ISO string before hitting the Prisma client.

    State Reset: Following a successful POST via Server Action, the form must reset amount and remarks, but retain the date context to allow rapid sequential logging of receipts from the same day.

Module B: The Calculation & Aggregation Engine

This replaces the fragile Excel Pivot Tables. This logic must exist exclusively on the server to prevent client-side manipulation and ensure data integrity.

    Reimbursement vs. Deduction Bifurcation: The engine must programmatically separate mileage based on standard rates.

        reimbursed_mileage = miles * 0.55 (Added to operational revenue/reimbursement tracking).

        tax_deductible_mileage = miles * 0.15 (Isolated for the tax export).

    Summary Endpoint Returns:
    TypeScript

    interface FinancialSummary {
      grossIncome: number;
      totalOpEx: number;
      netIncome: number;
      categoryBreakdown: Record<string, number>;
    }

Module C: Tax Professional Export Engine

A dedicated backend service built specifically for end-of-year tax preparation, aggregating data into IRS schedule lines.

    Implementation Logic:

        User selects a Fiscal Year (e.g., 2025).

        The server queries Transaction records where date >= 2025-01-01 and date <= 2025-12-31.

        The server generates a Pivot Summary Array: grouping by Category.name and summing the amount.

        The application returns a multi-sheet CSV or Excel file containing:

            Sheet 1 (Summary): Total Income, Total OpEx, Total Tax-Deductible Mileage, Total Non-Deductible Expenses, categorized by month.

            Sheet 2 (Raw Ledger): The complete chronologically sorted list of every transaction for audit protection.

4. UI/UX & Routing Specification

    / (Dashboard): High-level metrics: MTD (Month-to-Date) Net Income, YTD Gross Income. Includes a simple bar chart (recharts) showing Income vs. Expenses over the last 6 months.

    /log (Data Entry): The mobile-optimized input form. Large touch targets, native date picker input type="date", and native numeric keypad trigger input type="number" inputMode="decimal".

    /audit (Ledger View): A paginated, searchable data table of all historical transactions, allowing edits and deletions.

    /tax-export (Tax Portal): A minimalist screen with a year selector and a "Generate CPA Report" button triggering the Module C export payload.

5. Security & Authentication (Single-Tenant Enclave)

To replicate the closed-ecosystem security of a private Google Drive while hosting on the public web, the application will enforce strict OAuth gating.

    Implementation: NextAuth.js configured exclusively with the Google Provider.

    The Allowlist: In the authOptions callback, verify the incoming user.email against an environment variable (ALLOWED_ADMIN_EMAIL).

    Middleware: Next.js Middleware (middleware.ts) must protect all routes (except the login page), rejecting any unauthenticated or unauthorized traffic at the edge.

6. CI/CD Pipeline & Deployment Architecture

The deployment infrastructure ensures automatic updates without the need for manual server provisioning.

    Version Control (The Vault): A private GitHub repository.

    Hosting Configuration: Vercel linked directly to the main branch of the GitHub repository. Pushes to main will automatically trigger a build, run database migrations (npx prisma generate && npx prisma db push), and deploy to edge nodes.

    Database Hosting: A serverless PostgreSQL instance (Neon/Supabase) mapped to the Vercel environment via DATABASE_URL.

    Environment Variables Required:

        DATABASE_URL (Connection string)

        GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (For OAuth)

        NEXTAUTH_SECRET (JWT encryption key)

        NEXTAUTH_URL (Production URL)

        ALLOWED_ADMIN_EMAIL (The client's specific Gmail address)
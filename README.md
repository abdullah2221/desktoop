# POS & Inventory ERP Desktop Application

An offline-first Point of Sale (POS) and Enterprise Resource Planning (ERP) desktop application tailored for retail stores, specifically designed with the Pakistani market in mind. Built with modern web technologies and packaged for desktop using Electron.

## Features

- **Offline-First Architecture**: Powered by a robust local SQLite database (`better-sqlite3`), meaning no internet connection is required for day-to-day operations. Fast and responsive.
- **Point of Sale (POS)**: Streamlined and efficient checkout process for quick retail transactions.
- **Inventory Management**: Comprehensive tracking of products, categories, brands, units, and detailed stock movements.
- **Sales & Customers**: Manage invoices, quotations, customer ledgers, and invoice payments.
- **Purchases & Suppliers**: Handle supplier orders, stock-ins, and supplier payments.
- **Accounting Engine**: A built-in double-entry accounting system complete with journal entries, banking, bank reconciliations, and money transactions.
- **Multi-Branch Support**: Easily manage operations across multiple store branches and distinct classes/departments.
- **Expenses & Taxes**: Track day-to-day expenses and automatically calculate applicable taxes based on defined rules.
- **Comprehensive Reports**: Generate detailed reports covering sales, purchases, stock levels, and financial accounting.
- **Data Security & Backups**: Built-in automated backup and restore functionality to keep business data safe.
- **User Management**: Role-based access control (RBAC) and audit logging for security and accountability.

## Tech Stack

- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React 18](https://react.dev/), [React Router v6](https://reactrouter.com/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Data Management**: [React Hook Form](https://react-hook-form.com/), [TanStack Table v8](https://tanstack.com/table)
- **Database**: [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Synchronous, highly performant SQLite3 driver)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (End-to-end type safety)
- **Bundler & Build Tool**: [Vite](https://vitejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit Testing), [Playwright](https://playwright.dev/) (E2E Testing)

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd desktoop

# Install dependencies
npm install

# Rebuild native SQLite bindings for Electron
npm run build
```

### Development

To start the application in development mode:

```bash
npm run dev
```

This script uses `concurrently` to:
1. Start the Vite development server for the React renderer.
2. Compile the Electron main process TypeScript code in watch mode.
3. Launch the Electron application once the frontend server is ready.

### Packaging

To build and package the application for distribution (e.g., creating a `.exe`, `.dmg`, or `.AppImage`):

```bash
npm run package
```

### Testing

```bash
# Run unit and integration tests (uses the Node.js SQLite bindings)
npm run test

# Run End-to-End (E2E) tests with Playwright
npm run test:e2e
```

## Project Structure

- **`src/main/`**: The Electron main process. Contains the SQLite database schema, migrations, repositories for data access, and IPC (Inter-Process Communication) handlers.
- **`src/preload/`**: The preload scripts. Acts as a secure bridge, exposing specific main process functionalities (like database queries) to the renderer process via a `window.api` interface.
- **`src/renderer/`**: The React frontend application. Contains all UI components, pages (organized by features), and application state logic.
  - **`src/renderer/features/`**: Feature-based folder structure (e.g., `accounting`, `inventory`, `pos`, `sales`, `users`), keeping related components, hooks, and types together.
- **`database/`**: Stores the local SQLite databases (`erp.db`, `test.db`) and backups.
- **`e2e-tests/`**: Playwright test files for end-to-end UI testing.

## License

MIT License

# Splitwise Clone

A full-featured expense splitting app built with Next.js, TypeScript, and Tailwind CSS.

## Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI + PostgreSQL (planned)
- **Storage:** localStorage (frontend MVP)

## Features
- Create groups and add members
- Add expenses with equal or custom splits
- View balances — who owes whom
- Settle up between members
- Dashboard with all groups overview

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure
```
app/                    # Next.js App Router pages
  groups/[id]/         # Group detail, expenses, settle
components/            # Shared UI components
context/               # AppContext (localStorage state)
hooks/                 # useLocalStorage hook
lib/                   # Types + balance computation
```

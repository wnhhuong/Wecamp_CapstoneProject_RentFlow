# RentFlow frontend

## Features

### Guest
### Tenant
### Øwner

## Folder structure

frontend/
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── App.tsx             # Root shell: Header, Sidebar, Footer
│   ├── main.tsx            # React entry
│   ├── index.css           # Tailwind + design tokens
│   ├── assets/             # Bundled images
│   ├── components/
│   │   ├── ui/             # shadcn ui components (button, input, dialog, sheet, …)
│   │   ├── layout/         # Header, Sidebar, Footer
│   │   ├── feedback/       # Empty, error, page loading
│   │   └── status/         # StatusBadge (room, invoice, request, ticket)
│   ├── pages/
│   │   ├── auth/           # Login, first-login profile/contract
│   │   ├── guest/          # Browse rooms, room details
│   │   ├── user/           # Tenant dashboard, invoices, tickets, …
│   │   └── admin/          # Owner dashboard, rooms, users, approvals, …
│   └── shared/
│       ├── api/            # API modules by endpoints (auth, guest, user, admin)
│       │   ├── config.ts   # Base URL / env (placeholder)
│       │   └── endpoints.ts
│       ├── context/        # Global app's state (user context: who is logging in)
│       ├── hooks/          # Reusable custom hooks
│       └── utils/          # Reusable functions cho currency, date formatting, …
├── components.json         # shadcn config
├── vite.config.ts
└── package.json

## Stack

- React 19 + TypeScript
- Vite 8 (`@` → `src/`)
- Tailwind CSS 4 (`@tailwindcss/vite`)
- shadcn/ui (New York) + Radix UI + class-variance-authority
- IBM Plex Sans and RentFlow color tokens in `src/index.css`

Routing, auth, and API clients are not wired yet. `App.tsx` currently renders the signed-in shell with a hardcoded `user` role.

## Prerequisites

- Node.js 20 (same as GitHub Actions)
- npm (lockfile: `package-lock.json`)

## Run locally

```bash
cd frontend
npm install
npm run dev
# Onboarding — Hermes
<!-- This document is for any engineer (or future you) setting up the project from scratch. -->
<!-- Keep this updated as the setup process changes. -->

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git
- A Supabase account
- A Vercel account

## First-Time Setup

### 1. Clone the repo
```bash
git clone https://github.com/clintmccoy/hermes.git
cd hermes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in all required values. See comments in the file for where to find each value.

### 4. Set up Supabase
<!-- Add Supabase setup steps once schema is defined -->
- [ ] Create a Supabase project
- [ ] Run migrations: `[ command TBD ]`
- [ ] Configure Auth providers in Supabase dashboard

### 5. Run the development server
```bash
npm run dev
```
App runs at http://localhost:3000

## Deployment

Deployments are handled automatically via Vercel:
- Push to `main` → production deployment
- Push to any branch → preview deployment (unique URL generated)

## Project Structure
<!-- Fill in once the app structure is established -->

## Key Concepts & Gotchas
<!-- Add non-obvious things an engineer needs to know — update as you discover them -->

## Contacts
- **Owner**: Clinton McCoy (clintmccoy)
- **Repo**: https://github.com/clintmccoy/hermes
- **Linear**: [ Add link once project is created ]

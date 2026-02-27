# MaplePlan Prototype App (Vercel-ready)

This repo now runs as a deployable Next.js app.

## What is deployed

- App root: `/`
- React app flow: `/planner`
- Static prototype flow entry: `/prototype/screen1_planner_home.html`
- Prototype files are sourced from `Stitch_Designs/` and synced into `public/prototype/` on every dev/build run.

## Local development

```bash
npm install
npm run dev
```

Then open:
- `http://localhost:3000/`
- `http://localhost:3000/planner`
- `http://localhost:3000/prototype/screen1_planner_home.html`

## Build for production

```bash
npm run build
npm run start
```

## Deploy to Vercel

### Option 1: Vercel dashboard
1. Push this repo to GitHub.
2. In Vercel, click **Add New Project**.
3. Import the repo.
4. Framework should auto-detect as **Next.js**.
5. Click **Deploy**.

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel
vercel --prod
```

## Structure

- `app/` - Next.js App Router shell and React planner route
- `Stitch_Designs/` - editable source prototype HTML/CSS/JS
- `scripts/sync-prototype.mjs` - syncs source prototype assets into `public/prototype/`
- `public/prototype/` - static assets served by Next.js

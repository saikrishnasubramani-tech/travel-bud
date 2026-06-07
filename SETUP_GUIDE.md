# AI Travel Planner Setup Guide

This guide shows how to create the same Next.js 15 app from scratch.

## 1. Create the project

```bash
npx create-next-app@latest ai-travel-planner
```

When the setup asks questions, choose:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src/ directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: Yes
Import alias value: @/*
```

## 2. Move into the project folder

```bash
cd ai-travel-planner
```

## 3. Install the Gemini SDK

```bash
npm install @google/genai
```

## 4. Add your Gemini API key

Create a file named `.env.local` in the main `ai-travel-planner` folder.

Inside `.env.local`, add:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Important: do not share this key publicly. The `.gitignore` file should include `.env.local`.

## 5. Start the development server

```bash
npm run dev
```

Open this URL in your browser:

```text
http://localhost:3000
```

## Folder Structure

```text
ai-travel-planner/
+-- package.json
+-- .env.local.example
+-- .gitignore
+-- next.config.ts
+-- tsconfig.json
+-- postcss.config.mjs
+-- eslint.config.mjs
+-- next-env.d.ts
+-- README.md
+-- src/
    +-- lib/
        +-- travel-data.ts
    +-- app/
        +-- api/
            +-- itinerary/
                +-- route.ts
        +-- globals.css
        +-- layout.tsx
        +-- page.tsx
```

## Where Each File Goes

`package.json`

Create this in the main `ai-travel-planner` folder. It lists the app dependencies and scripts like `npm run dev`.

`.env.local`

Create this in the main `ai-travel-planner` folder. It stores your real Gemini API key. Do not commit or share it.

`.env.local.example`

Create this in the main `ai-travel-planner` folder. It shows other developers which environment variables are needed.

`.gitignore`

Create this in the main `ai-travel-planner` folder. It prevents private and generated files from being saved to Git.

`next.config.ts`

Create this in the main `ai-travel-planner` folder. It stores Next.js configuration.

`tsconfig.json`

Create this in the main `ai-travel-planner` folder. It configures TypeScript.

`postcss.config.mjs`

Create this in the main `ai-travel-planner` folder. It connects Tailwind CSS to the build system.

`eslint.config.mjs`

Create this in the main `ai-travel-planner` folder. It configures code checking rules.

`next-env.d.ts`

Create this in the main `ai-travel-planner` folder. Next.js usually creates this automatically.

`src/app/globals.css`

Create this inside `src/app`. It contains global CSS and imports Tailwind CSS.

`src/lib/travel-data.ts`

Create this inside `src/lib`. It contains the destination list and 150+ currency options.

`src/app/api/itinerary/route.ts`

Create this inside `src/app/api/itinerary`. It receives the form data, sends it to Google Gemini, and returns a structured trip plan.

`src/app/layout.tsx`

Create this inside `src/app`. It is the root layout used by every page in the App Router.

`src/app/page.tsx`

Create this inside `src/app`. It is the homepage with the destination input, number of days input, budget input, and interests multi-select.

## Useful Commands

```bash
npm install
npm install @google/genai
npm run dev
npm run build
npm run start
npm run lint
```

`npm install` installs dependencies.

`npm run dev` starts the app for development.

`npm run build` checks that the app can be prepared for production.

`npm run start` runs the production build after `npm run build`.

`npm run lint` checks the code for common problems.

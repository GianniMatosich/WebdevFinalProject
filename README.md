# Resume Forge

A local Electron + Express + SQLite resume builder for the CSC3100 final project.

## What is included

- Electron desktop wrapper
- Node.js + Express REST API
- SQLite database storage
- Single-page HTML/CSS/JavaScript frontend
- Bootstrap and Bootstrap Icons installed locally, not through CDNs
- Gemini AI improvement endpoint
- `config/rules.json` rules file for AI behavior
- Print-friendly resume layout for saving/printing as PDF
- Placeholder icon and author image files

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root. You can copy `.env.example`:

```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:

```env
GEMINI_API_KEY=your_actual_key_here
```

4. Start the Electron app:

```bash
npm run dev
```

You can also run only the Express server:

```bash
npm start
```

Then open:

```text
http://localhost:3100
```

## Required `.env` values

Only `GEMINI_API_KEY` must be filled in by you. The rest can stay as shown unless you want to change ports, database location, or Gemini model.

```env
PORT=3100
NODE_ENV=development
DATABASE_PATH=server/data/resume_builder.sqlite
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-1.5-flash
APP_URL=http://localhost:3100
```

## Where the Gemini key is used

The backend loads `.env` with `dotenv` in `server/server.js`. The route below uses the key and the rules file:

```text
POST /api/ai/improve
```

The server combines:

```text
config/rules.json + section type + user resume text
```

Then it sends that prompt to Gemini and returns JSON suggestions to the frontend.

## Important security note

Do not commit `.env` to GitHub. This project includes `.gitignore` rules that exclude `.env` and the local SQLite database file.

## Database

SQLite automatically creates the database at:

```text
server/data/resume_builder.sqlite
```

The app seeds one starter resume based on Gianni Matosich's resume structure.

## Assets to replace

Replace these placeholders before submission:

```text
public/assets/icons/app-icon-placeholder.svg
public/assets/img/author-placeholder.txt
public/assets/img/app-icon-placeholder.txt
```

You can add real image files such as:

```text
public/assets/img/author.png
public/assets/icons/app-icon.png
```

Then update `public/index.html` and `electron-main.js` if you change the icon path.

## Submission checklist

Include:

- Full project folder zipped
- GitHub repository link
- Documentation of AI usage in `docs/AI_USAGE.md`
- Rules file in `config/rules.json`
- Example PDF generated from the app's print layout
- Special run/install instructions
- Statement saying whether your project may be shared
- Candid or AI-generated author image

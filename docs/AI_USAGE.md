# Generative AI Usage Documentation

This project uses generative AI to review and improve resume content entered by the user.

## AI Provider

Google Gemini API

## Where the API key is stored

The Gemini API key is loaded from a local `.env` file in the project root:

```env
GEMINI_API_KEY=your_actual_key_here
```

The `.env` file is intentionally excluded from Git using `.gitignore`.

## Rules File

The rules file is located at:

```text
config/rules.json
```

The rules file defines how AI should behave when improving resume content. It instructs the AI to:

- Preserve the user's original meaning
- Avoid inventing experience, skills, dates, metrics, or accomplishments
- Use professional resume wording
- Keep suggestions concise and appropriate for students or entry-level applicants
- Return structured JSON with the original text, improved text, suggestions, and warnings

## Backend Integration

The backend route is:

```text
POST /api/ai/improve
```

The route reads:

1. The user's selected section type
2. The user's entered resume text
3. `config/rules.json`
4. The Gemini API key from `.env`

It then sends the combined prompt to Gemini and returns the result to the frontend.

## User Control

AI suggestions are triggered by explicit user action through an "Improve with AI" button. The app does not automatically send every keystroke to Gemini.

## Safety and Accuracy Constraints

The rules file specifically prevents the AI from fabricating accomplishments or adding unsupported claims. If the AI suggests a change, the user should review it before saving it into the resume.

## Code Comments

AI-related code is located mainly in:

```text
server/server.js
public/js/app.js
config/rules.json
```

The backend code comments identify where the rules file and Gemini API request are used.

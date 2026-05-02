require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3100;
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(ROOT, process.env.DATABASE_PATH)
  : path.join(DATA_DIR, 'resume_builder.sqlite');
const RULES_PATH = path.join(ROOT, 'config', 'rules.json');

const RESOLVED_DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(RESOLVED_DATA_DIR)) fs.mkdirSync(RESOLVED_DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
// AI rules are documented in config/rules.json and included in each Gemini prompt.
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/vendor/bootstrap', express.static(path.join(ROOT, 'node_modules', 'bootstrap', 'dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(ROOT, 'node_modules', 'bootstrap-icons', 'font')));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

const seedResumeData = {
  header: {
    fullName: 'Gianni Matosich',
    location: 'Cookeville, TN 38501',
    phone: '(615)-944-1352',
    email: '',
    github: 'https://github.com/GianniMatosich',
    linkedin: 'www.linkedin.com/in/gianni-matosich/'
  },
  professional_statement: 'Senior Computer Science student with hands-on experience in full-stack development, cloud deployment, and DevOps engineering. Proven experience modernizing legacy systems, deploying production web applications on Google Cloud Platform, and building secure, scalable applications using Node.js, Nginx, and MariaDB.',
  education: [
    {
      school: 'Tennessee Technological University',
      location: 'Cookeville, TN',
      degree: 'Bachelor of Science, Computer Science',
      graduationDate: 'May 2026',
      coursework: 'Software Engineering, Parallel Programming, Operating Systems, Design of Algorithms, Database Management Systems, Data Science, Artificial Intelligence'
    }
  ],
  experience: [
    {
      company: 'Subway',
      location: 'Cookeville, TN',
      title: 'Sandwich Artist',
      dates: 'March 2025 - August 2025',
      bullets: ['Independently managed daily operations in a dynamic environment, ensuring accurate order preparation.']
    },
    {
      company: 'Chipotle',
      location: 'Cookeville, TN',
      title: 'Team Member',
      dates: 'August 2023 - January 2024',
      bullets: ['Collaborated with team members in a fast-paced environment, ensuring efficient order processing.']
    }
  ],
  projects: [
    {
      name: 'Field Missions of Tennessee',
      role: 'DevOps and Frontend Developer',
      bullets: [
        'Modernized and deployed a legacy full-stack web application to a production Google Cloud Platform VM running Debian GNU/Linux, configuring Nginx, Node.js, Express, and MariaDB for reliability and scalability.',
        'Designed, implemented, and secured the production infrastructure using DuckDNS for DNS management, Let’s Encrypt (Certbot) for SSL certificates, PM2 for process management, and UFW with Fail2Ban for server security.',
        'Developed an admin dashboard supporting blog publishing, system alerts, healthcare clinic categorization, and geolocation-based organization of services for operational use.',
        'Collaborated within a five-person development team, contributing across DevOps and full-stack roles while maintaining, debugging, and extending features in an actively evolving codebase.'
      ]
    },
    {
      name: 'HippoExchange',
      role: 'Creator',
      bullets: [
        'Developed the full front end using HTML, CSS, and JavaScript with dynamic integration to backend APIs.',
        'Deployed the application using Docker, Nginx, Authentik, and DuckDNS for authentication and hosting.'
      ]
    }
  ],
  skills: 'C++, C#, Python, JavaScript, CSS, Assembly, HTML, Lua, Node.js, PM2, React, SQL, GitHub, Google Cloud Platform (GCP), Linux, MS Office',
  certifications: [],
  awards: []
};

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    userID TEXT PRIMARY KEY,
    displayName TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS resumes (
    resumeID TEXT PRIMARY KEY,
    userID TEXT NOT NULL,
    title TEXT NOT NULL,
    targetRole TEXT,
    resumeData TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS ai_settings (
    userID TEXT PRIMARY KEY,
    geminiApiKey TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID)
  )`);

  const user = await get('SELECT userID FROM users WHERE userID = ?', ['local-user']);
  if (!user) {
    await run('INSERT INTO users (userID, displayName) VALUES (?, ?)', ['local-user', 'Local Student']);
    await run('INSERT INTO ai_settings (userID, geminiApiKey) VALUES (?, ?)', ['local-user', '']);
    await run(
      'INSERT INTO resumes (resumeID, userID, title, targetRole, resumeData) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'local-user', 'Software / DevOps Resume', 'Software Engineering Internship', JSON.stringify(seedResumeData)]
    );
  }
}

function parseResume(row) {
  return { ...row, resumeData: JSON.parse(row.resumeData) };
}

app.get('/api/rules', (req, res) => res.json(rules));

app.get('/api/resumes', async (req, res) => {
  try {
    const rows = await all('SELECT resumeID, title, targetRole, createdAt, updatedAt FROM resumes WHERE userID = ? ORDER BY updatedAt DESC', ['local-user']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/resumes/:resumeID', async (req, res) => {
  try {
    const row = await get('SELECT * FROM resumes WHERE resumeID = ? AND userID = ?', [req.params.resumeID, 'local-user']);
    if (!row) return res.status(404).json({ message: 'Resume not found' });
    res.json(parseResume(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/resumes', async (req, res) => {
  try {
    const resumeID = uuidv4();
    const title = req.body.title || 'Untitled Resume';
    const targetRole = req.body.targetRole || '';
    const resumeData = req.body.resumeData || seedResumeData;
    await run('INSERT INTO resumes (resumeID, userID, title, targetRole, resumeData) VALUES (?, ?, ?, ?, ?)', [resumeID, 'local-user', title, targetRole, JSON.stringify(resumeData)]);
    const row = await get('SELECT * FROM resumes WHERE resumeID = ?', [resumeID]);
    res.status(201).json(parseResume(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/resumes/:resumeID', async (req, res) => {
  try {
    const existing = await get('SELECT * FROM resumes WHERE resumeID = ? AND userID = ?', [req.params.resumeID, 'local-user']);
    if (!existing) return res.status(404).json({ message: 'Resume not found' });

    await run(
      'UPDATE resumes SET title = ?, targetRole = ?, resumeData = ?, updatedAt = CURRENT_TIMESTAMP WHERE resumeID = ? AND userID = ?',
      [req.body.title || existing.title, req.body.targetRole || existing.targetRole || '', JSON.stringify(req.body.resumeData || JSON.parse(existing.resumeData)), req.params.resumeID, 'local-user']
    );

    const row = await get('SELECT * FROM resumes WHERE resumeID = ?', [req.params.resumeID]);
    res.json(parseResume(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/resumes/:resumeID', async (req, res) => {
  try {
    await run('DELETE FROM resumes WHERE resumeID = ? AND userID = ?', [req.params.resumeID, 'local-user']);
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  const row = await get('SELECT geminiApiKey FROM ai_settings WHERE userID = ?', ['local-user']);
  res.json({ hasGeminiKey: Boolean((row && row.geminiApiKey) || process.env.GEMINI_API_KEY) });
});

app.put('/api/settings', async (req, res) => {
  try {
    await run('UPDATE ai_settings SET geminiApiKey = ?, updatedAt = CURRENT_TIMESTAMP WHERE userID = ?', [req.body.geminiApiKey || '', 'local-user']);
    res.json({ message: 'Settings saved', hasGeminiKey: Boolean(req.body.geminiApiKey) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Uses Gemini to improve a user-provided resume section.
// The prompt is built from the rules file plus the user's selected section and text.
app.post('/api/ai/improve', async (req, res) => {
  try {
    const { sectionType, text } = req.body;
    if (!text || !sectionType) return res.status(400).json({ message: 'sectionType and text are required' });

    const settings = await get('SELECT geminiApiKey FROM ai_settings WHERE userID = ?', ['local-user']);
    const key = (settings && settings.geminiApiKey) || process.env.GEMINI_API_KEY;

    if (!key) {
      return res.json({
        original_text: text,
        improved_text: text,
        suggestions: ['No Gemini API key is configured yet. Add one in Settings to enable AI suggestions.'],
        warnings: ['AI was not called because no API key was available.']
      });
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const prompt = `${rules.prompt_template.system_instruction}\n\nRules file:\n${JSON.stringify(rules, null, 2)}\n\nSection type: ${sectionType}\nUser text:\n${text}\n\n${rules.prompt_template.instruction}`;
    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, '').trim();

    try {
      res.json(JSON.parse(raw));
    } catch {
      res.json({ original_text: text, improved_text: raw, suggestions: ['AI returned text that was not valid JSON, so it was normalized by the server.'], warnings: [] });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Resume Forge running at http://localhost:${PORT}`));
});

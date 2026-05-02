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
const itemTypes = ['education', 'experience', 'projects', 'skills', 'certifications', 'awards'];

const RESOLVED_DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(RESOLVED_DATA_DIR)) fs.mkdirSync(RESOLVED_DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
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

function makeId(prefix) {
  return `${prefix}-${uuidv4()}`;
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
  generated: {
    professional_statement: 'Senior Computer Science student with hands-on experience in full-stack development, cloud deployment, and DevOps engineering. Proven experience modernizing legacy systems, deploying production web applications on Google Cloud Platform, and building secure, scalable applications using Node.js, Nginx, and MariaDB.'
  },
  library: {
    education: [
      {
        id: makeId('edu'),
        school: 'Tennessee Technological University',
        location: 'Cookeville, TN',
        degree: 'Bachelor of Science, Computer Science',
        graduationDate: 'May 2026',
        coursework: 'Software Engineering, Parallel Programming, Operating Systems, Design of Algorithms, Database Management Systems, Data Science, Artificial Intelligence'
      }
    ],
    experience: [
      {
        id: makeId('exp'),
        company: 'Subway',
        location: 'Cookeville, TN',
        title: 'Sandwich Artist',
        dates: 'March 2025 - August 2025',
        bullets: ['Independently managed daily operations in a dynamic environment, ensuring accurate order preparation.']
      },
      {
        id: makeId('exp'),
        company: 'Chipotle',
        location: 'Cookeville, TN',
        title: 'Team Member',
        dates: 'August 2023 - January 2024',
        bullets: ['Collaborated with team members in a fast-paced environment, ensuring efficient order processing.']
      }
    ],
    projects: [
      {
        id: makeId('proj'),
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
        id: makeId('proj'),
        name: 'HippoExchange',
        role: 'Creator',
        bullets: [
          'Developed the full front end using HTML, CSS, and JavaScript with dynamic integration to backend APIs.',
          'Deployed the application using Docker, Nginx, Authentik, and DuckDNS for authentication and hosting.'
        ]
      }
    ],
    skills: 'C++, C#, Python, JavaScript, CSS, Assembly, HTML, Lua, Node.js, PM2, React, SQL, GitHub, Google Cloud Platform (GCP), Linux, MS Office'
      .split(',')
      .map((skill) => ({ id: makeId('skill'), name: skill.trim(), category: '' })),
    certifications: [],
    awards: []
  },
  selections: {
    education: {},
    experience: {},
    projects: {},
    skills: {},
    certifications: {},
    awards: {}
  }
};
itemTypes.forEach((type) => {
  seedResumeData.selections[type] = {};
  seedResumeData.library[type].forEach((item) => { seedResumeData.selections[type][item.id] = true; });
});

function normalizeResumeData(data) {
  const d = data || {};
  d.header = d.header || {};
  d.generated = d.generated || {};
  d.library = d.library || {};
  d.selections = d.selections || {};

  itemTypes.forEach((type) => {
    d.library[type] = d.library[type] || [];
    d.selections[type] = d.selections[type] || {};
  });

  if (d.professional_statement && !d.generated.professional_statement) {
    d.generated.professional_statement = d.professional_statement;
    delete d.professional_statement;
  }

  if (Array.isArray(d.education) && d.library.education.length === 0) {
    d.library.education = d.education.map((item) => ({ id: item.id || makeId('edu'), ...item }));
    d.library.education.forEach((item) => { d.selections.education[item.id] = true; });
    delete d.education;
  }
  if (Array.isArray(d.experience) && d.library.experience.length === 0) {
    d.library.experience = d.experience.map((item) => ({ id: item.id || makeId('exp'), ...item }));
    d.library.experience.forEach((item) => { d.selections.experience[item.id] = true; });
    delete d.experience;
  }
  if (Array.isArray(d.projects) && d.library.projects.length === 0) {
    d.library.projects = d.projects.map((item) => ({ id: item.id || makeId('proj'), ...item }));
    d.library.projects.forEach((item) => { d.selections.projects[item.id] = true; });
    delete d.projects;
  }
  if (typeof d.skills === 'string' && d.library.skills.length === 0) {
    d.library.skills = d.skills.split(',').map((skill) => skill.trim()).filter(Boolean).map((name) => ({ id: makeId('skill'), name, category: '' }));
    d.library.skills.forEach((item) => { d.selections.skills[item.id] = true; });
    delete d.skills;
  }
  if (Array.isArray(d.certifications) && d.library.certifications.length === 0) {
    d.library.certifications = d.certifications.map((name) => ({ id: makeId('cert'), name }));
    d.library.certifications.forEach((item) => { d.selections.certifications[item.id] = true; });
    delete d.certifications;
  }
  if (Array.isArray(d.awards) && d.library.awards.length === 0) {
    d.library.awards = d.awards.map((name) => ({ id: makeId('award'), name }));
    d.library.awards.forEach((item) => { d.selections.awards[item.id] = true; });
    delete d.awards;
  }

  itemTypes.forEach((type) => {
    d.library[type] = d.library[type].map((item) => ({ id: item.id || makeId(type), ...item }));
    d.library[type].forEach((item) => {
      if (d.selections[type][item.id] === undefined) d.selections[type][item.id] = false;
    });
  });

  return d;
}

function parseResume(row) {
  return { ...row, resumeData: normalizeResumeData(JSON.parse(row.resumeData)) };
}

function mergeLibraries(base, incoming) {
  const merged = JSON.parse(JSON.stringify(base));
  itemTypes.forEach((type) => {
    const byId = new Map((merged.library[type] || []).map((item) => [item.id, item]));
    (incoming.library[type] || []).forEach((item) => {
      if (!item.id) item.id = makeId(type);
      byId.set(item.id, item);
    });
    merged.library[type] = Array.from(byId.values());
  });
  return merged;
}

async function getGlobalLibrary() {
  const rows = await all('SELECT resumeData FROM resumes WHERE userID = ?', ['local-user']);
  let global = normalizeResumeData({ library: {}, selections: {}, generated: {}, header: {} });
  rows.forEach((row) => {
    const data = normalizeResumeData(JSON.parse(row.resumeData));
    global = mergeLibraries(global, data);
  });
  return global.library;
}

async function applyGlobalLibraryToResume(resume) {
  const globalLibrary = await getGlobalLibrary();
  itemTypes.forEach((type) => {
    const existingSelections = resume.resumeData.selections[type] || {};
    resume.resumeData.library[type] = globalLibrary[type] || [];
    resume.resumeData.selections[type] = {};
    resume.resumeData.library[type].forEach((item) => {
      resume.resumeData.selections[type][item.id] = Boolean(existingSelections[item.id]);
    });
  });
  return resume;
}

async function updateAllResumeLibrariesFrom(sourceData) {
  const rows = await all('SELECT resumeID, resumeData FROM resumes WHERE userID = ?', ['local-user']);
  const globalLibrary = (await getGlobalLibrary());
  let merged = normalizeResumeData({ library: globalLibrary, selections: {}, generated: {}, header: {} });
  merged = mergeLibraries(merged, sourceData);

  for (const row of rows) {
    const data = normalizeResumeData(JSON.parse(row.resumeData));
    itemTypes.forEach((type) => {
      const currentSelections = data.selections[type] || {};
      data.library[type] = merged.library[type];
      data.selections[type] = {};
      data.library[type].forEach((item) => {
        data.selections[type][item.id] = Boolean(currentSelections[item.id]);
      });
    });
    await run('UPDATE resumes SET resumeData = ?, updatedAt = updatedAt WHERE resumeID = ?', [JSON.stringify(data), row.resumeID]);
  }
}

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

async function getGeminiKey() {
  const settings = await get('SELECT geminiApiKey FROM ai_settings WHERE userID = ?', ['local-user']);
  return (settings && settings.geminiApiKey) || process.env.GEMINI_API_KEY;
}

function selectedItems(data, type) {
  return (data.library[type] || []).filter((item) => Boolean(data.selections[type]?.[item.id]));
}

function resumeContext(resume) {
  const d = normalizeResumeData(resume.resumeData || {});
  return {
    targetRole: resume.targetRole || '',
    header: d.header,
    education: selectedItems(d, 'education'),
    experience: selectedItems(d, 'experience'),
    projects: selectedItems(d, 'projects'),
    skills: selectedItems(d, 'skills'),
    certifications: selectedItems(d, 'certifications'),
    awards: selectedItems(d, 'awards')
  };
}

function localStatement(resume) {
  const context = resumeContext(resume);
  const targetRole = context.targetRole || 'professional role';
  const degree = context.education[0]?.degree || 'student';
  const projects = context.projects.map((p) => p.name).filter(Boolean).slice(0, 2).join(' and ');
  const skills = context.skills.map((s) => s.name).filter(Boolean).slice(0, 8).join(', ');
  return `${degree} seeking a ${targetRole} position${skills ? ` with experience using ${skills}` : ''}${projects ? ` and project work including ${projects}` : ''}.`;
}

function scoreItemForTarget(item, targetRole) {
  const haystack = JSON.stringify(item).toLowerCase();
  const terms = String(targetRole || '').toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  const resumeTerms = ['software', 'developer', 'devops', 'cloud', 'node', 'express', 'database', 'sql', 'javascript', 'linux', 'security', 'api'];
  const allTerms = [...new Set([...terms, ...resumeTerms])];
  return allTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function localOptimize(resume) {
  const d = normalizeResumeData(resume.resumeData || {});
  const selections = {};
  itemTypes.forEach((type) => {
    selections[type] = {};
    const items = d.library[type] || [];
    const scored = items.map((item) => ({ item, score: scoreItemForTarget(item, resume.targetRole) }));
    const limits = { education: 2, experience: 3, projects: 3, skills: 12, certifications: 5, awards: 5 };
    scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limits[type])
      .forEach(({ item, score }) => { selections[type][item.id] = score > 0 || type === 'education'; });
    items.forEach((item) => { if (selections[type][item.id] === undefined) selections[type][item.id] = false; });
  });
  const draftResume = { ...resume, resumeData: { ...d, selections } };
  return {
    selections,
    professional_statement: localStatement(draftResume),
    explanation: 'A local keyword optimizer selected items that appear most relevant to the target role. Gemini was not used because no API key was configured.'
  };
}

async function generateJsonWithGemini(prompt, fallback) {
  const key = await getGeminiKey();
  if (!key) return fallback();

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const raw = result.response.text().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { improved_text: raw, suggestions: ['AI returned text that was not valid JSON.'], warnings: [] };
  }
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
    const resume = parseResume(row);
    res.json(await applyGlobalLibraryToResume(resume));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/resumes', async (req, res) => {
  try {
    const resumeID = uuidv4();
    const title = req.body.title || 'Untitled Resume';
    const targetRole = req.body.targetRole || '';
    const resumeData = normalizeResumeData(req.body.resumeData || seedResumeData);
    await run('INSERT INTO resumes (resumeID, userID, title, targetRole, resumeData) VALUES (?, ?, ?, ?, ?)', [resumeID, 'local-user', title, targetRole, JSON.stringify(resumeData)]);
    await updateAllResumeLibrariesFrom(resumeData);
    const row = await get('SELECT * FROM resumes WHERE resumeID = ?', [resumeID]);
    res.status(201).json(await applyGlobalLibraryToResume(parseResume(row)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/resumes/:resumeID', async (req, res) => {
  try {
    const existing = await get('SELECT * FROM resumes WHERE resumeID = ? AND userID = ?', [req.params.resumeID, 'local-user']);
    if (!existing) return res.status(404).json({ message: 'Resume not found' });

    const incomingData = normalizeResumeData(req.body.resumeData || JSON.parse(existing.resumeData));
    await updateAllResumeLibrariesFrom(incomingData);

    await run(
      'UPDATE resumes SET title = ?, targetRole = ?, resumeData = ?, updatedAt = CURRENT_TIMESTAMP WHERE resumeID = ? AND userID = ?',
      [req.body.title || existing.title, req.body.targetRole || existing.targetRole || '', JSON.stringify(incomingData), req.params.resumeID, 'local-user']
    );

    const row = await get('SELECT * FROM resumes WHERE resumeID = ?', [req.params.resumeID]);
    res.json(await applyGlobalLibraryToResume(parseResume(row)));
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
  const key = await getGeminiKey();
  res.json({ hasGeminiKey: Boolean(key) });
});

app.put('/api/settings', async (req, res) => {
  try {
    await run('UPDATE ai_settings SET geminiApiKey = ?, updatedAt = CURRENT_TIMESTAMP WHERE userID = ?', [req.body.geminiApiKey || '', 'local-user']);
    res.json({ message: 'Settings saved', hasGeminiKey: Boolean(req.body.geminiApiKey) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/ai/improve', async (req, res) => {
  try {
    const { sectionType, text } = req.body;
    if (!text || !sectionType) return res.status(400).json({ message: 'sectionType and text are required' });

    const prompt = `${rules.prompt_template.system_instruction}\n\nRules file:\n${JSON.stringify(rules, null, 2)}\n\nSection type: ${sectionType}\nUser text:\n${text}\n\nReview this content and return only valid JSON with original_text, improved_text, suggestions, and warnings. Do not invent facts.`;
    const response = await generateJsonWithGemini(prompt, () => ({
      original_text: text,
      improved_text: text,
      suggestions: ['No Gemini API key is configured yet. Add one in Settings to enable AI suggestions.'],
      warnings: ['AI was not called because no API key was available.']
    }));
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/ai/statement', async (req, res) => {
  try {
    const { resume } = req.body;
    if (!resume) return res.status(400).json({ message: 'resume is required' });
    const context = resumeContext(resume);
    const prompt = `${rules.prompt_template.system_instruction}\n\nRules file:\n${JSON.stringify(rules, null, 2)}\n\nCreate a professional resume statement for the target role using only the selected resume facts below. Do not invent facts. Keep it 2 sentences or fewer. Return only valid JSON in this shape: {"professional_statement":"...","suggestions":[],"warnings":[]}\n\nResume facts:\n${JSON.stringify(context, null, 2)}`;
    const response = await generateJsonWithGemini(prompt, () => ({
      professional_statement: localStatement(resume),
      suggestions: ['No Gemini API key was configured, so a local statement draft was generated.'],
      warnings: []
    }));
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/ai/optimize', async (req, res) => {
  try {
    const { resume } = req.body;
    if (!resume) return res.status(400).json({ message: 'resume is required' });
    const d = normalizeResumeData(resume.resumeData || {});
    const prompt = `${rules.prompt_template.system_instruction}\n\nRules file:\n${JSON.stringify(rules, null, 2)}\n\nA user is tailoring a resume to a target role. Select the best education, experience, project, skill, certification, and award items. Return only valid JSON in this exact shape:\n{"selections":{"education":{},"experience":{},"projects":{},"skills":{},"certifications":{},"awards":{}},"professional_statement":"...","explanation":"..."}\nEach selections object must use item IDs as keys and true/false as values. Use only provided facts. Do not invent facts.\n\nTarget role: ${resume.targetRole || ''}\n\nAvailable resume library:\n${JSON.stringify(d.library, null, 2)}`;
    const response = await generateJsonWithGemini(prompt, () => localOptimize({ ...resume, resumeData: d }));
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Resume Forge running at http://localhost:${PORT}`));
});

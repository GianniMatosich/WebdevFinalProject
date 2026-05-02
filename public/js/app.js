let currentResume = null;
let currentSection = 'basics';

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function textInput(label, path, value = '', type = 'text') {
  return `
    <div class="mb-3">
      <label class="form-label">${label}</label>
      <input class="form-control resume-input" data-path="${path}" type="${type}" value="${escapeHtml(value)}">
    </div>`;
}

function textarea(label, path, value = '', rows = 4) {
  return `
    <div class="mb-3">
      <label class="form-label">${label}</label>
      <textarea class="form-control resume-input" data-path="${path}" rows="${rows}">${escapeHtml(value)}</textarea>
      <button class="btn btn-outline-primary btn-sm mt-2 ai-btn" data-path="${path}" data-section="${path.includes('professional') ? 'professional_statement' : 'resume_content'}">
        <i class="bi bi-stars me-1"></i>Improve with AI
      </button>
    </div>`;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  parts.slice(0, -1).forEach((part) => {
    if (current[part] === undefined) current[part] = {};
    current = current[part];
  });
  current[parts.at(-1)] = value;
}

function bindInputs() {
  document.querySelectorAll('.resume-input').forEach((input) => {
    input.addEventListener('input', (event) => {
      const path = event.target.dataset.path;
      if (path === 'title' || path === 'targetRole') {
        currentResume[path] = event.target.value;
      } else {
        setByPath(currentResume.resumeData, path, event.target.value);
      }
      renderPreview();
    });
  });

  document.querySelectorAll('.ai-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const path = button.dataset.path;
      const original = getByPath(currentResume.resumeData, path);
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Improving';
      try {
        const result = await api.improve(button.dataset.section, original);
        setByPath(currentResume.resumeData, path, result.improved_text || original);
        renderEditor();
        renderPreview();
        showAiResult(result);
      } catch (err) {
        alert(err.message);
      } finally {
        button.disabled = false;
      }
    });
  });
}

function showAiResult(result) {
  const message = [
    'Improved Text:',
    result.improved_text || '',
    '',
    'Suggestions:',
    ...(result.suggestions || []).map((item) => `- ${item}`),
    '',
    'Warnings:',
    ...((result.warnings || []).length ? result.warnings.map((item) => `- ${item}`) : ['- None'])
  ].join('\n');
  alert(message);
}

function renderBasics() {
  const d = currentResume.resumeData;
  return `
    ${textInput('Resume Title', 'title', currentResume.title)}
    ${textInput('Target Role', 'targetRole', currentResume.targetRole || '')}
    <hr>
    ${textInput('Full Name', 'header.fullName', d.header.fullName)}
    ${textInput('Location', 'header.location', d.header.location)}
    ${textInput('Phone', 'header.phone', d.header.phone)}
    ${textInput('Email', 'header.email', d.header.email)}
    ${textInput('GitHub', 'header.github', d.header.github)}
    ${textInput('LinkedIn', 'header.linkedin', d.header.linkedin)}
    ${textarea('Professional Statement', 'professional_statement', d.professional_statement, 5)}
  `;
}

function renderEducation() {
  const items = currentResume.resumeData.education || [];
  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${textInput('School', `education.${i}.school`, item.school)}
      ${textInput('Location', `education.${i}.location`, item.location)}
      ${textInput('Degree', `education.${i}.degree`, item.degree)}
      ${textInput('Graduation Date', `education.${i}.graduationDate`, item.graduationDate)}
      ${textarea('Relevant Coursework', `education.${i}.coursework`, item.coursework, 3)}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addEducationBtn">Add Education</button>`;
}

function renderExperience() {
  const items = currentResume.resumeData.experience || [];
  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${textInput('Company', `experience.${i}.company`, item.company)}
      ${textInput('Location', `experience.${i}.location`, item.location)}
      ${textInput('Title', `experience.${i}.title`, item.title)}
      ${textInput('Dates', `experience.${i}.dates`, item.dates)}
      ${textarea('Bullets, one per line', `experience.${i}.bulletsText`, (item.bullets || []).join('\n'), 5)}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addExperienceBtn">Add Experience</button>`;
}

function renderProjects() {
  const items = currentResume.resumeData.projects || [];
  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${textInput('Project Name', `projects.${i}.name`, item.name)}
      ${textInput('Role', `projects.${i}.role`, item.role)}
      ${textarea('Bullets, one per line', `projects.${i}.bulletsText`, (item.bullets || []).join('\n'), 6)}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addProjectBtn">Add Project</button>`;
}

function renderSkills() {
  const d = currentResume.resumeData;
  return textarea('Skills', 'skills', d.skills, 6);
}

function renderExtras() {
  const d = currentResume.resumeData;
  return `
    ${textarea('Certifications, one per line', 'certificationsText', (d.certifications || []).join('\n'), 4)}
    ${textarea('Awards, one per line', 'awardsText', (d.awards || []).join('\n'), 4)}
  `;
}

function normalizeResumeData() {
  currentResume.title = getByPath(currentResume, 'title') || currentResume.title;
  currentResume.targetRole = getByPath(currentResume, 'targetRole') || currentResume.targetRole;
  (currentResume.resumeData.experience || []).forEach((item) => {
    if (item.bulletsText !== undefined) item.bullets = item.bulletsText.split('\n').filter(Boolean);
  });
  (currentResume.resumeData.projects || []).forEach((item) => {
    if (item.bulletsText !== undefined) item.bullets = item.bulletsText.split('\n').filter(Boolean);
  });
  if (currentResume.resumeData.certificationsText !== undefined) {
    currentResume.resumeData.certifications = currentResume.resumeData.certificationsText.split('\n').filter(Boolean);
  }
  if (currentResume.resumeData.awardsText !== undefined) {
    currentResume.resumeData.awards = currentResume.resumeData.awardsText.split('\n').filter(Boolean);
  }
}

function renderEditor() {
  const titles = { basics: 'Basics', education: 'Education', experience: 'Experience', projects: 'Projects', skills: 'Skills', extras: 'Certifications & Awards' };
  $('editorTitle').textContent = titles[currentSection];
  const renderers = { basics: renderBasics, education: renderEducation, experience: renderExperience, projects: renderProjects, skills: renderSkills, extras: renderExtras };
  $('editorPanel').innerHTML = renderers[currentSection]();
  bindInputs();
  bindAddButtons();
}

function bindAddButtons() {
  $('addEducationBtn')?.addEventListener('click', () => {
    currentResume.resumeData.education.push({ school: '', location: '', degree: '', graduationDate: '', coursework: '' });
    renderEditor();
  });
  $('addExperienceBtn')?.addEventListener('click', () => {
    currentResume.resumeData.experience.push({ company: '', location: '', title: '', dates: '', bullets: [] });
    renderEditor();
  });
  $('addProjectBtn')?.addEventListener('click', () => {
    currentResume.resumeData.projects.push({ name: '', role: '', bullets: [] });
    renderEditor();
  });
}

function section(title, content) {
  if (!content || !String(content).trim()) return '';
  return `<div class="resume-section-title">${title}</div>${content}`;
}

function renderPreview() {
  normalizeResumeData();
  const d = currentResume.resumeData;
  const contact = [d.header.location, d.header.phone, d.header.email, d.header.github, d.header.linkedin].filter(Boolean).join(' | ');
  const education = (d.education || []).map((e) => `
    <div class="resume-item-head"><span>${escapeHtml(e.school)}</span><span>${escapeHtml(e.location)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(e.degree)}</span><span>${escapeHtml(e.graduationDate)}</span></div>
    ${e.coursework ? `<div><strong>Relevant Coursework:</strong> ${escapeHtml(e.coursework)}</div>` : ''}
  `).join('');
  const experience = (d.experience || []).map((e) => `
    <div class="resume-item-head"><span>${escapeHtml(e.company)}</span><span>${escapeHtml(e.location)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(e.title)}</span><span>${escapeHtml(e.dates)}</span></div>
    <ul>${(e.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
  `).join('');
  const projects = (d.projects || []).map((p) => `
    <div class="resume-item-head"><span>${escapeHtml(p.name)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(p.role)}</span></div>
    <ul>${(p.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
  `).join('');

  $('resumePreview').innerHTML = `
    <div class="text-center">
      <div class="resume-name">${escapeHtml(d.header.fullName)}</div>
      <div class="resume-contact">${escapeHtml(contact)}</div>
    </div>
    ${section('Professional Statement', `<p>${escapeHtml(d.professional_statement)}</p>`)}
    ${section('Education', education)}
    ${section('Experience', experience)}
    ${section('Projects', projects)}
    ${section('Skills', `<p>${escapeHtml(d.skills)}</p>`)}
    ${section('Certifications', (d.certifications || []).map((x) => `<div>${escapeHtml(x)}</div>`).join(''))}
    ${section('Awards', (d.awards || []).map((x) => `<div>${escapeHtml(x)}</div>`).join(''))}
  `;
}

async function loadResumes(selectedId = null) {
  const resumes = await api.getResumes();
  $('resumeSelect').innerHTML = resumes.map((resume) => `<option value="${resume.resumeID}">${escapeHtml(resume.title)}</option>`).join('');
  const id = selectedId || resumes[0]?.resumeID;
  if (id) {
    $('resumeSelect').value = id;
    currentResume = await api.getResume(id);
    renderEditor();
    renderPreview();
  }
}

function bindGlobalEvents() {
  $('sectionTabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-section]');
    if (!button) return;
    document.querySelectorAll('#sectionTabs button').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    currentSection = button.dataset.section;
    renderEditor();
  });

  $('resumeSelect').addEventListener('change', async (event) => {
    currentResume = await api.getResume(event.target.value);
    renderEditor();
    renderPreview();
  });

  $('saveResumeBtn').addEventListener('click', async () => {
    normalizeResumeData();
    const saved = await api.updateResume(currentResume.resumeID, currentResume);
    currentResume = saved;
    await loadResumes(saved.resumeID);
    alert('Resume saved.');
  });

  $('newResumeBtn').addEventListener('click', async () => {
    normalizeResumeData();
    const created = await api.createResume({
      title: 'New Resume',
      targetRole: '',
      resumeData: JSON.parse(JSON.stringify(currentResume.resumeData))
    });
    await loadResumes(created.resumeID);
  });

  $('printBtn').addEventListener('click', () => window.print());

  $('saveSettingsBtn').addEventListener('click', async () => {
    await api.saveSettings($('geminiApiKey').value);
    $('geminiApiKey').value = '';
    alert('Settings saved.');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindGlobalEvents();
  await loadResumes();
});

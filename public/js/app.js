let currentResume = null;
let currentSection = 'basics';

const $ = (id) => document.getElementById(id);
const itemTypes = ['education', 'experience', 'projects', 'skills', 'certifications', 'awards'];

function showMessage(message, type = 'info', timeout = 4500) {
  const box = $('appMessage');

  if (!box) {
    console.log(message);
    return;
  }

  box.className = `app-message alert alert-${type} shadow-sm no-print`;
  box.textContent = message;
  box.classList.remove('d-none');

  window.clearTimeout(showMessage._timer);
  showMessage._timer = window.setTimeout(() => {
    box.classList.add('d-none');
  }, timeout);
}

function focusFirstEditorInput() {
  window.setTimeout(() => {
    const firstInput = document.querySelector('#editorPanel .resume-input');
    if (firstInput) firstInput.focus();
  }, 50);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function textInput(label, path, value = '', type = 'text') {
  return `
    <div class="mb-3">
      <label class="form-label">${escapeHtml(label)}</label>
      <input class="form-control resume-input" data-path="${escapeHtml(path)}" type="${type}" value="${escapeHtml(value)}">
    </div>`;
}

function textarea(label, path, value = '', rows = 4, aiSection = 'resume_content') {
  return `
    <div class="mb-3">
      <label class="form-label">${escapeHtml(label)}</label>
      <textarea class="form-control resume-input" data-path="${escapeHtml(path)}" rows="${rows}">${escapeHtml(value)}</textarea>
      <button class="btn btn-outline-primary btn-sm mt-2 ai-btn" data-path="${escapeHtml(path)}" data-section="${escapeHtml(aiSection)}">
        <i class="bi bi-stars me-1"></i>Review with AI
      </button>
    </div>`;
}

function checkbox(type, id, checked) {
  return `
    <div class="form-check include-check mb-3">
      <input class="form-check-input include-input" type="checkbox" id="include-${type}-${id}" data-type="${type}" data-id="${id}" ${checked ? 'checked' : ''}>
      <label class="form-check-label" for="include-${type}-${id}">Include this item in this resume</label>
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

function ensureResumeShape(resume) {
  if (!resume.resumeData) resume.resumeData = {};
  const d = resume.resumeData;

  d.header = d.header || {};
  d.generated = d.generated || {};
  d.library = d.library || {};
  d.selections = d.selections || {};

  itemTypes.forEach((type) => {
    d.library[type] = d.library[type] || [];
    d.selections[type] = d.selections[type] || {};
  });

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
    d.library.skills = d.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean)
      .map((name) => ({ id: makeId('skill'), name, category: '' }));
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

  if (!d.generated.professional_statement && d.professional_statement) {
    d.generated.professional_statement = d.professional_statement;
    delete d.professional_statement;
  }
}

function selectedItems(type) {
  ensureResumeShape(currentResume);
  const d = currentResume.resumeData;
  return (d.library[type] || []).filter((item) => Boolean(d.selections[type]?.[item.id]));
}

function buildLocalStatement() {
  ensureResumeShape(currentResume);
  const d = currentResume.resumeData;
  const targetRole = currentResume.targetRole || 'professional role';
  const degree = selectedItems('education')[0]?.degree || 'student';
  const projectNames = selectedItems('projects').map((p) => p.name).filter(Boolean).slice(0, 2).join(' and ');
  const skillNames = selectedItems('skills').map((s) => s.name).filter(Boolean).slice(0, 8).join(', ');
  const experienceTitle = selectedItems('experience')[0]?.title || '';

  const parts = [
    `${degree} seeking a ${targetRole} position`,
    skillNames ? `with experience using ${skillNames}` : '',
    projectNames ? `and project work including ${projectNames}` : '',
    experienceTitle ? `Supported by professional experience as a ${experienceTitle}` : ''
  ].filter(Boolean);

  d.generated.professional_statement = `${parts.join(' ')}.`;
}

function normalizeResumeData() {
  ensureResumeShape(currentResume);
  currentResume.title = getByPath(currentResume, 'title') || currentResume.title;
  currentResume.targetRole = getByPath(currentResume, 'targetRole') || currentResume.targetRole;

  currentResume.resumeData.library.experience.forEach((item) => {
    if (item.bulletsText !== undefined) {
      item.bullets = item.bulletsText.split('\n').map((b) => b.trim()).filter(Boolean);
      delete item.bulletsText;
    }
  });

  currentResume.resumeData.library.projects.forEach((item) => {
    if (item.bulletsText !== undefined) {
      item.bullets = item.bulletsText.split('\n').map((b) => b.trim()).filter(Boolean);
      delete item.bulletsText;
    }
  });

  if (!currentResume.resumeData.generated.professional_statement) buildLocalStatement();
}

function bindInputs() {
  document.querySelectorAll('.resume-input').forEach((input) => {
    input.addEventListener('input', (event) => {
      const path = event.target.dataset.path;

      if (path === 'title' || path === 'targetRole') {
        currentResume[path] = event.target.value;
        if (path === 'targetRole') buildLocalStatement();
      } else {
        setByPath(currentResume.resumeData, path, event.target.value);
      }

      renderPreview();
    });
  });

  document.querySelectorAll('.include-input').forEach((input) => {
    input.addEventListener('change', (event) => {
      const { type, id } = event.target.dataset;
      ensureResumeShape(currentResume);
      currentResume.resumeData.selections[type][id] = event.target.checked;
      renderPreview();
    });
  });

  document.querySelectorAll('.ai-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const path = button.dataset.path;
      const original = getByPath(currentResume.resumeData, path) || '';

      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Reviewing';

      try {
        const result = await api.improve(button.dataset.section, original);
        const reviewedText = result.improved_text || original;

        setByPath(currentResume.resumeData, path, reviewedText);
        renderEditor();
        renderPreview();
        showAiResult(result);
        focusFirstEditorInput();
      } catch (err) {
        showMessage(err.message, 'danger', 8000);
      } finally {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-stars me-1"></i>Review with AI';
      }
    });
  });
}

function showAiResult(result) {
  const message = [
    'AI review applied.',
    '',
    'Suggestions:',
    ...(result.suggestions || []).map((item) => `- ${item}`),
    '',
    'Warnings:',
    ...((result.warnings || []).length ? result.warnings.map((item) => `- ${item}`) : ['- None'])
  ].join('\n');

  showMessage(message, 'success', 8000);
}

function renderBasics() {
  ensureResumeShape(currentResume);
  const d = currentResume.resumeData;

  return `
    ${textInput('Resume Title', 'title', currentResume.title)}
    ${textInput('Target Role', 'targetRole', currentResume.targetRole || '')}
    <div class="alert alert-info py-2">
      Professional Statement is generated from the target role and the selected resume content. It is not manually edited.
    </div>
    <button class="btn btn-outline-primary btn-sm mb-3" id="generateStatementBtn">
      <i class="bi bi-magic me-1"></i>Generate Professional Statement
    </button>
    <div class="readonly-statement mb-3">${escapeHtml(d.generated.professional_statement || '')}</div>
    <hr>
    ${textInput('Full Name', 'header.fullName', d.header.fullName || '')}
    ${textInput('Location', 'header.location', d.header.location || '')}
    ${textInput('Phone', 'header.phone', d.header.phone || '')}
    ${textInput('Email', 'header.email', d.header.email || '')}
    ${textInput('GitHub', 'header.github', d.header.github || '')}
    ${textInput('LinkedIn', 'header.linkedin', d.header.linkedin || '')}
  `;
}

function renderEducation() {
  ensureResumeShape(currentResume);
  const items = currentResume.resumeData.library.education || [];

  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${checkbox('education', item.id, currentResume.resumeData.selections.education[item.id])}
      ${textInput('School', `library.education.${i}.school`, item.school || '')}
      ${textInput('Location', `library.education.${i}.location`, item.location || '')}
      ${textInput('Degree', `library.education.${i}.degree`, item.degree || '')}
      ${textInput('Graduation Date', `library.education.${i}.graduationDate`, item.graduationDate || '')}
      ${textarea('Relevant Coursework', `library.education.${i}.coursework`, item.coursework || '', 3, 'education')}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addEducationBtn">Add Education</button>`;
}

function renderExperience() {
  ensureResumeShape(currentResume);
  const items = currentResume.resumeData.library.experience || [];

  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${checkbox('experience', item.id, currentResume.resumeData.selections.experience[item.id])}
      ${textInput('Company', `library.experience.${i}.company`, item.company || '')}
      ${textInput('Location', `library.experience.${i}.location`, item.location || '')}
      ${textInput('Title', `library.experience.${i}.title`, item.title || '')}
      ${textInput('Dates', `library.experience.${i}.dates`, item.dates || '')}
      ${textarea('Responsibilities/details, one per line', `library.experience.${i}.bulletsText`, (item.bullets || []).join('\n'), 5, 'experience')}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addExperienceBtn">Add Experience</button>`;
}

function renderProjects() {
  ensureResumeShape(currentResume);
  const items = currentResume.resumeData.library.projects || [];

  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${checkbox('projects', item.id, currentResume.resumeData.selections.projects[item.id])}
      ${textInput('Project Name', `library.projects.${i}.name`, item.name || '')}
      ${textInput('Role', `library.projects.${i}.role`, item.role || '')}
      ${textarea('Responsibilities/details, one per line', `library.projects.${i}.bulletsText`, (item.bullets || []).join('\n'), 6, 'project')}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addProjectBtn">Add Project</button>`;
}

function renderSkills() {
  ensureResumeShape(currentResume);
  const items = currentResume.resumeData.library.skills || [];

  return `${items.map((item, i) => `
    <div class="dynamic-card">
      ${checkbox('skills', item.id, currentResume.resumeData.selections.skills[item.id])}
      ${textInput('Skill', `library.skills.${i}.name`, item.name || '')}
      ${textInput('Category', `library.skills.${i}.category`, item.category || '')}
    </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addSkillBtn">Add Skill</button>`;
}

function renderExtras() {
  ensureResumeShape(currentResume);
  const certs = currentResume.resumeData.library.certifications || [];
  const awards = currentResume.resumeData.library.awards || [];

  return `
    <h3 class="h6">Certifications</h3>
    ${certs.map((item, i) => `
      <div class="dynamic-card">
        ${checkbox('certifications', item.id, currentResume.resumeData.selections.certifications[item.id])}
        ${textInput('Certification', `library.certifications.${i}.name`, item.name || '')}
        ${textInput('Issuer', `library.certifications.${i}.issuer`, item.issuer || '')}
        ${textInput('Date', `library.certifications.${i}.date`, item.date || '')}
      </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm mb-3" id="addCertificationBtn">Add Certification</button>

    <h3 class="h6">Awards</h3>
    ${awards.map((item, i) => `
      <div class="dynamic-card">
        ${checkbox('awards', item.id, currentResume.resumeData.selections.awards[item.id])}
        ${textInput('Award', `library.awards.${i}.name`, item.name || '')}
        ${textInput('Issuer', `library.awards.${i}.issuer`, item.issuer || '')}
        ${textInput('Date', `library.awards.${i}.date`, item.date || '')}
      </div>`).join('')}
    <button class="btn btn-outline-primary btn-sm" id="addAwardBtn">Add Award</button>
  `;
}

function renderEditor() {
  const titles = {
    basics: 'Basics',
    education: 'Education',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    extras: 'Certifications & Awards'
  };

  $('editorTitle').textContent = titles[currentSection];

  const renderers = {
    basics: renderBasics,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    extras: renderExtras
  };

  $('editorPanel').innerHTML = renderers[currentSection]();
  bindInputs();
  bindAddButtons();
}

function bindAddButtons() {
  $('generateStatementBtn')?.addEventListener('click', generateProfessionalStatement);

  $('addEducationBtn')?.addEventListener('click', () => {
    const id = makeId('edu');
    currentResume.resumeData.library.education.push({ id, school: '', location: '', degree: '', graduationDate: '', coursework: '' });
    currentResume.resumeData.selections.education[id] = false;
    renderEditor();
    focusFirstEditorInput();
  });

  $('addExperienceBtn')?.addEventListener('click', () => {
    const id = makeId('exp');
    currentResume.resumeData.library.experience.push({ id, company: '', location: '', title: '', dates: '', bullets: [] });
    currentResume.resumeData.selections.experience[id] = false;
    renderEditor();
    focusFirstEditorInput();
  });

  $('addProjectBtn')?.addEventListener('click', () => {
    const id = makeId('proj');
    currentResume.resumeData.library.projects.push({ id, name: '', role: '', bullets: [] });
    currentResume.resumeData.selections.projects[id] = false;
    renderEditor();
    focusFirstEditorInput();
  });

  $('addSkillBtn')?.addEventListener('click', () => {
    const id = makeId('skill');
    currentResume.resumeData.library.skills.push({ id, name: '', category: '' });
    currentResume.resumeData.selections.skills[id] = false;
    renderEditor();
    focusFirstEditorInput();
  });

  $('addCertificationBtn')?.addEventListener('click', () => {
    const id = makeId('cert');
    currentResume.resumeData.library.certifications.push({ id, name: '', issuer: '', date: '' });
    currentResume.resumeData.selections.certifications[id] = false;
    renderEditor();
    focusFirstEditorInput();
  });

  $('addAwardBtn')?.addEventListener('click', () => {
    const id = makeId('award');
    currentResume.resumeData.library.awards.push({ id, name: '', issuer: '', date: '' });
    currentResume.resumeData.selections.awards[id] = false;
    renderEditor();
    focusFirstEditorInput();
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

  const education = selectedItems('education').map((e) => `
    <div class="resume-item-head"><span>${escapeHtml(e.school)}</span><span>${escapeHtml(e.location)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(e.degree)}</span><span>${escapeHtml(e.graduationDate)}</span></div>
    ${e.coursework ? `<div><strong>Relevant Coursework:</strong> ${escapeHtml(e.coursework)}</div>` : ''}
  `).join('');

  const experience = selectedItems('experience').map((e) => `
    <div class="resume-item-head"><span>${escapeHtml(e.company)}</span><span>${escapeHtml(e.location)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(e.title)}</span><span>${escapeHtml(e.dates)}</span></div>
    <ul>${(e.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
  `).join('');

  const projects = selectedItems('projects').map((p) => `
    <div class="resume-item-head"><span>${escapeHtml(p.name)}</span></div>
    <div class="resume-subhead"><span>${escapeHtml(p.role)}</span></div>
    <ul>${(p.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
  `).join('');

  const skills = selectedItems('skills').map((s) => escapeHtml(s.name)).filter(Boolean).join(', ');
  const certifications = selectedItems('certifications').map((c) => `<div>${escapeHtml([c.name, c.issuer, c.date].filter(Boolean).join(' — '))}</div>`).join('');
  const awards = selectedItems('awards').map((a) => `<div>${escapeHtml([a.name, a.issuer, a.date].filter(Boolean).join(' — '))}</div>`).join('');

  $('resumePreview').innerHTML = `
    <div class="text-center">
      <div class="resume-name">${escapeHtml(d.header.fullName)}</div>
      <div class="resume-contact">${escapeHtml(contact)}</div>
    </div>
    ${section('Professional Statement', `<p>${escapeHtml(d.generated.professional_statement)}</p>`)}
    ${section('Education', education)}
    ${section('Experience', experience)}
    ${section('Projects', projects)}
    ${section('Skills', `<p>${skills}</p>`)}
    ${section('Certifications', certifications)}
    ${section('Awards', awards)}
  `;
}

async function loadResumes(selectedId = null) {
  const resumes = await api.getResumes();

  $('resumeSelect').innerHTML = resumes
    .map((resume) => `<option value="${resume.resumeID}">${escapeHtml(resume.title)}</option>`)
    .join('');

  const id = selectedId || resumes[0]?.resumeID;

  if (id) {
    $('resumeSelect').value = id;
    currentResume = await api.getResume(id);
    ensureResumeShape(currentResume);
    renderEditor();
    renderPreview();
  }
}

async function generateProfessionalStatement() {
  normalizeResumeData();

  const button = $('generateStatementBtn');

  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating';
  }

  try {
    const result = await api.generateStatement(currentResume);
    currentResume.resumeData.generated.professional_statement =
      result.professional_statement ||
      result.improved_text ||
      currentResume.resumeData.generated.professional_statement;

    renderEditor();
    renderPreview();
    showMessage('Professional statement generated.', 'success');
    focusFirstEditorInput();
  } catch (err) {
    buildLocalStatement();
    renderEditor();
    renderPreview();
    showMessage(`AI statement generation failed, so a local draft was created.\n\n${err.message}`, 'warning', 8000);
    focusFirstEditorInput();
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-magic me-1"></i>Generate Professional Statement';
    }
  }
}

async function optimizeResume() {
  normalizeResumeData();

  const button = $('optimizeResumeBtn');
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Optimizing';

  try {
    const result = await api.optimizeResume(currentResume);

    if (result.selections) {
      itemTypes.forEach((type) => {
        if (result.selections[type]) currentResume.resumeData.selections[type] = result.selections[type];
      });
    }

    if (result.professional_statement) {
      currentResume.resumeData.generated.professional_statement = result.professional_statement;
    }

    renderEditor();
    renderPreview();

    showMessage(
      `${result.explanation || 'Resume optimized for the target role.'}\n\nClick Save Resume to persist these choices.`,
      'success',
      9000
    );

    focusFirstEditorInput();
  } catch (err) {
    showMessage(err.message, 'danger', 8000);
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-lightning-charge me-1"></i>Optimize Resume';
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
    ensureResumeShape(currentResume);
    renderEditor();
    renderPreview();
  });

  $('saveResumeBtn').addEventListener('click', async () => {
    try {
      normalizeResumeData();
      const saved = await api.updateResume(currentResume.resumeID, currentResume);
      currentResume = saved;
      await loadResumes(saved.resumeID);
      showMessage('Resume saved. Included items and the shared item library were persisted.', 'success');
      focusFirstEditorInput();
    } catch (err) {
      showMessage(err.message, 'danger', 8000);
    }
  });

  $('newResumeBtn').addEventListener('click', async () => {
    try {
      normalizeResumeData();

      const newData = clone(currentResume.resumeData);

      itemTypes.forEach((type) => {
        newData.selections[type] = {};
        (newData.library[type] || []).forEach((item) => {
          newData.selections[type][item.id] = false;
        });
      });

      newData.generated.professional_statement = '';

      const created = await api.createResume({
        title: 'New Resume',
        targetRole: '',
        resumeData: newData
      });

      await loadResumes(created.resumeID);
      showMessage('New resume created. Select the items you want to include, then save.', 'success');
      focusFirstEditorInput();
    } catch (err) {
      showMessage(err.message, 'danger', 8000);
    }
  });

  $('optimizeResumeBtn').addEventListener('click', optimizeResume);
  $('printBtn').addEventListener('click', () => window.print());

  $('saveSettingsBtn').addEventListener('click', async () => {
    try {
      await api.saveSettings($('geminiApiKey').value);
      $('geminiApiKey').value = '';
      showMessage('Settings saved.', 'success');

      const modalEl = $('settingsModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      focusFirstEditorInput();
    } catch (err) {
      showMessage(err.message, 'danger', 8000);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    bindGlobalEvents();
    await loadResumes();
  } catch (err) {
    showMessage(err.message, 'danger', 10000);
  }
});
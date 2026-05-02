const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);
    return data;
  },
  getResumes() {
    return this.request('/api/resumes');
  },
  getResume(id) {
    return this.request(`/api/resumes/${id}`);
  },
  createResume(payload) {
    return this.request('/api/resumes', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateResume(id, payload) {
    return this.request(`/api/resumes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  getSettings() {
    return this.request('/api/settings');
  },
  improve(sectionType, text) {
    return this.request('/api/ai/improve', { method: 'POST', body: JSON.stringify({ sectionType, text }) });
  },
  generateStatement(resume) {
    return this.request('/api/ai/statement', { method: 'POST', body: JSON.stringify({ resume }) });
  },
  optimizeResume(resume) {
    return this.request('/api/ai/optimize', { method: 'POST', body: JSON.stringify({ resume }) });
  },
  saveSettings(geminiApiKey) {
    return this.request('/api/settings', { method: 'PUT', body: JSON.stringify({ geminiApiKey }) });
  }
};
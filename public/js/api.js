// api.js
// This file centralizes all frontend API calls.
// Instead of writing fetch() repeatedly in app.js, the app calls these helper methods.

const api = {
  // Generic request helper used by every API method below.
  // It sends JSON by default, parses the JSON response, and throws an error if the request fails.
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });

    // If the response body is not valid JSON, use an empty object instead of crashing.
    const data = await response.json().catch(() => ({}));

    // Convert failed HTTP responses into JavaScript errors so app.js can show a message.
    if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);

    return data;
  },

  // Gets the list of saved resumes for the local user.
  getResumes() {
    return this.request('/api/resumes');
  },

  // Gets one full resume by ID, including its resumeData JSON.
  getResume(id) {
    return this.request(`/api/resumes/${id}`);
  },

  // Creates a new resume record in SQLite.
  createResume(payload) {
    return this.request('/api/resumes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Updates an existing resume record in SQLite.
  updateResume(id, payload) {
    return this.request(`/api/resumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Checks whether a Gemini API key is currently available.
  // The backend checks both SQLite settings and the .env file.
  getSettings() {
    return this.request('/api/settings');
  },

  // Sends one user-entered resume text field to Gemini for review.
  improve(sectionType, text) {
    return this.request('/api/ai/improve', {
      method: 'POST',
      body: JSON.stringify({ sectionType, text })
    });
  },

  // Sends the current resume to the backend so Gemini can generate a professional statement.
  generateStatement(resume) {
    return this.request('/api/ai/statement', {
      method: 'POST',
      body: JSON.stringify({ resume })
    });
  },

  // Sends the current resume and target role to Gemini so it can select the best resume items.
  optimizeResume(resume) {
    return this.request('/api/ai/optimize', {
      method: 'POST',
      body: JSON.stringify({ resume })
    });
  },

  // Saves the user's Gemini API key locally through the backend.
  saveSettings(geminiApiKey) {
    return this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ geminiApiKey })
    });
  }
};
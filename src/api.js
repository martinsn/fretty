const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('fretty_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('fretty_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('fretty_token');
  }

  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(API_BASE + path, options);
    
    if (res.status === 401) {
      this.clearToken();
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return res.json();
  }

  // Auth
  async register(username, password) {
    const data = await this.request('POST', '/auth/register', { username, password });
    this.setToken(data.access_token);
    return data;
  }

  async login(username, password) {
    const data = await this.request('POST', '/auth/login', { username, password });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  logout() {
    this.clearToken();
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Cards
  async getAllCards() {
    return this.request('GET', '/cards/all');
  }

  async getDueCards() {
    return this.request('GET', '/cards/due');
  }

  async getRandomCard() {
    return this.request('GET', '/cards/random');
  }

  async answerCard(positionKey, quality) {
    return this.request('POST', '/cards/answer', { position_key: positionKey, quality });
  }

  async initializeCards() {
    return this.request('POST', '/cards/init');
  }

  // Progress
  async getStats() {
    return this.request('GET', '/progress/stats');
  }

  async getSettings() {
    return this.request('GET', '/progress/settings');
  }

  async updateSettings(settings) {
    return this.request('PUT', '/progress/settings', {
      whole_notes_only: settings.wholeNotesOnly,
      strings: settings.strings,
      max_fret: settings.maxFret,
      practice_mode: settings.practiceMode,
    });
  }
}

export const api = new ApiService();

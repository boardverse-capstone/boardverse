/**
 * Test helpers
 * - HTTP request wrapper
 * - Auth helpers (login, refresh, token storage)
 * - Assertion helpers
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// ============ HTTP Client ============

class HttpClient {
  constructor(baseUrl = config.baseUrl) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = { ...config.defaultHeaders };
  }

  /**
   * Build full URL from endpoint
   */
  url(endpoint, params) {
    let url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    return url;
  }

  /**
   * Low-level request method
   */
  async request(method, endpoint, options = {}) {
    const url = this.url(endpoint, options.params);
    const headers = { ...this.defaultHeaders, ...(options.headers || {}) };

    // AbortController cho timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.requestTimeout);

    const init = {
      method: method.toUpperCase(),
      headers,
      signal: controller.signal,
    };

    if (options.body !== undefined) {
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const start = Date.now();
    try {
      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      const elapsed = Date.now() - start;
      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        elapsed,
        url,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        status: 0,
        error: error.message,
        elapsed: Date.now() - start,
        url,
      };
    }
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }
  post(endpoint, body, options = {}) {
    return this.request('POST', endpoint, { ...options, body });
  }
  put(endpoint, body, options = {}) {
    return this.request('PUT', endpoint, { ...options, body });
  }
  patch(endpoint, body, options = {}) {
    return this.request('PATCH', endpoint, { ...options, body });
  }
  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders.Authorization = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders.Authorization;
    }
  }
}

// ============ Token Storage ============

const tokenStore = {
  admin: null,
  manager: null,
  staff: null,
  player: null,
};

function setToken(role, token) {
  tokenStore[role] = token;
}
function getToken(role) {
  return tokenStore[role];
}
function clearTokens() {
  tokenStore.admin = null;
  tokenStore.manager = null;
  tokenStore.staff = null;
  tokenStore.player = null;
}

// ============ Rate Limit Detection ============

/**
 * Check if error is rate limit (429)
 */
function isRateLimited(error) {
  return error && (error.message?.includes('429') || error.message?.includes('Too Many'));
}

/**
 * Check if result is rate limited
 */
function isResultRateLimited(result) {
  return result && result.status === 429;
}

/**
 * Check if client has valid auth token (not rate limited)
 */
function hasAuth(http) {
  return Boolean(http.defaultHeaders.Authorization);
}

// ============ Auth Helpers ============

/**
 * Login và lưu token
 */
async function login(role, client = null) {
  const http = client || new HttpClient();
  const user = config.users[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  const result = await http.post('/api/auth/login', {
    usernameOrEmail: user.email,
    password: user.password,
  });

  if (!result.ok) {
    throw new Error(`Login failed for ${role} (${result.status}): ${JSON.stringify(result.data)}`);
  }

  const token = result.data?.data?.token || result.data?.token;
  const refreshToken = result.data?.data?.refreshToken || result.data?.refreshToken;

  if (!token) throw new Error(`No token in login response for ${role}`);
  setToken(role, token);
  return { token, refreshToken, data: result.data };
}

/**
 * Login all roles at once
 */
async function loginAll() {
  const results = {};
  for (const role of ['admin', 'manager', 'staff', 'player']) {
    try {
      results[role] = await login(role);
    } catch (err) {
      results[role] = { error: err.message };
    }
  }
  return results;
}

/**
 * Refresh token
 */
async function refreshToken(refreshTokenValue, role) {
  const http = new HttpClient();
  const result = await http.post('/api/auth/refresh-token', { refreshToken: refreshTokenValue });
  if (result.ok) {
    const newToken = result.data?.data?.token;
    if (newToken && role) setToken(role, newToken);
  }
  return result;
}

// ============ Test Result Logger ============

class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.startTime = Date.now();
  }

  /**
   * Define a test
   */
  test(name, fn) {
    this.tests.push({ name, fn, status: 'pending' });
  }

  /**
   * Run all tests
   */
  async run() {
    console.log(`\n\x1b[1m\x1b[36m▶ Suite: ${this.suiteName}\x1b[0m`);
    console.log(`  Tests: ${this.tests.length}`);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let rateLimitHit = false;

    for (const t of this.tests) {
      const start = Date.now();

      // If rate limit was hit, skip remaining tests
      if (rateLimitHit) {
        t.status = 'skipped';
        t.duration = 0;
        skipped++;
        console.log(`  \x1b[33m⊘\x1b[0m ${t.name} \x1b[90m(skipped due to rate limit)\x1b[0m`);
        continue;
      }

      try {
        await t.fn();
        t.status = 'passed';
        t.duration = Date.now() - start;
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${t.name} \x1b[90m(${t.duration}ms)\x1b[0m`);
      } catch (err) {
        const isRateLimit = err.message.includes('RATE_LIMITED') || isRateLimited(err);
        t.status = isRateLimit ? 'skipped' : 'failed';
        t.error = err.message;
        t.duration = Date.now() - start;

        if (isRateLimit) {
          skipped++;
          rateLimitHit = true;
          console.log(`  \x1b[33m⊘\x1b[0m ${t.name} \x1b[90m(${t.duration}ms)\x1b[0m`);
          console.log(`    \x1b[33m⚠ Rate limit hit — skipping remaining tests in this suite\x1b[0m`);
        } else {
          failed++;
          console.log(`  \x1b[31m✗\x1b[0m ${t.name} \x1b[90m(${t.duration}ms)\x1b[0m`);
          console.log(`    \x1b[31m${err.message}\x1b[0m`);
        }
      }
    }

    const total = this.tests.length;
    const totalDuration = Date.now() - this.startTime;

    const result = {
      suite: this.suiteName,
      total,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests: this.tests,
      timestamp: new Date().toISOString(),
    };

    const statusColor = failed === 0 ? '\x1b[32m' : '\x1b[31m';
    const skipNote = skipped > 0 ? ` (${skipped} skipped)` : '';
    console.log(`\n${statusColor}Result: ${passed}/${total} passed${skipNote}\x1b[0m`);

    return result;
  }
}

// ============ Assertion Helpers ============

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertOk(result, message) {
  if (!result.ok) {
    if (result.status === 429) {
      throw new Error('RATE_LIMITED: Backend rate limited this request (429)');
    }
    const errorMsg = result.data?.message || result.data?.error || JSON.stringify(result.data);
    throw new Error(
      message || `Expected OK response, got ${result.status}: ${errorMsg}`
    );
  }
}

function assertStatus(result, status, message) {
  if (result.status === 429) {
    throw new Error('RATE_LIMITED: Backend rate limited this request (429)');
  }
  if (result.status !== status) {
    throw new Error(
      message || `Expected status ${status}, got ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`
    );
  }
}

function assertHasProperty(obj, prop, message) {
  if (!obj || !(prop in obj)) {
    throw new Error(message || `Expected object to have property "${prop}"`);
  }
}

function assertInRange(value, min, max, message) {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new Error(message || `Expected ${value} to be in range [${min}, ${max}]`);
  }
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message || `Expected array, got ${typeof value}`);
  }
}

// ============ Report Writer ============

function saveReport(suiteResult) {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${suiteResult.suite.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  const filepath = path.join(resultsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(suiteResult, null, 2));
  return filepath;
}

module.exports = {
  HttpClient,
  TestRunner,
  assert,
  assertEqual,
  assertOk,
  assertStatus,
  assertHasProperty,
  assertInRange,
  assertArray,
  login,
  loginAll,
  refreshToken,
  setToken,
  getToken,
  clearTokens,
  saveReport,
  // Helpers
  isRateLimited,
  isResultRateLimited,
  hasAuth,
};

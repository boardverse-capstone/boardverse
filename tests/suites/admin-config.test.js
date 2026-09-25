/**
 * Admin Config API Tests (Bypass time-window, Demo mode, System config)
 */

const {
  HttpClient,
  TestRunner,
  assert,
  assertOk,
  assertStatus,
  login,
  clearTokens,
  saveReport,
} = require('../helpers');

async function runAdminConfigTests() {
  const suite = new TestRunner('Admin Config API');
  const http = new HttpClient();

  // Setup
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  // ============ Bypass Time Window ============
  suite.test('GET /api/v1/admin/configs/bypass-time-window → 200', async () => {
    const result = await http.get('/api/v1/admin/configs/bypass-time-window');
    assertOk(result, 'Bypass status thất bại');
  });

  suite.test('POST bypass-time-window bật → 200', async () => {
    const result = await http.post('/api/v1/admin/configs/bypass-time-window');
    assertOk(result, 'Bật bypass thất bại');
  });

  suite.test('DELETE bypass-time-window tắt → 200', async () => {
    const result = await http.delete('/api/v1/admin/configs/bypass-time-window');
    assertOk(result, 'Tắt bypass thất bại');
  });

  // ============ Demo Loosen ============
  suite.test('GET /api/v1/admin/configs/demo-loosen-lobby-constraints → 200', async () => {
    const result = await http.get('/api/v1/admin/configs/demo-loosen-lobby-constraints');
    assertOk(result, 'Demo loosen status thất bại');
  });

  // ============ System Config Lookup ============
  suite.test('GET /api/v1/system-configs/{key} → 200 hoặc 404', async () => {
    const result = await http.get('/api/v1/system-configs/bvc_enabled');
    assert(
      result.ok || result.status === 404,
      `Expected 200/404, got ${result.status}`
    );
  });

  // ============ Cache Invalidate ============
  suite.test('POST /api/v1/admin/configs/invalidate-cache → 200', async () => {
    const result = await http.post('/api/v1/admin/configs/invalidate-cache', {});
    assertOk(result, 'Invalidate cache thất bại');
  });

  // ============ Authorization ============
  suite.test('Staff không truy cập admin/configs → 403', async () => {
    let staffLogin;
    try {
      staffLogin = await login('staff', http);
    } catch (err) {
      console.log('    ⚠ Staff test user chưa seed, skip authorization test');
      return;
    }
    const staffClient = new HttpClient();
    staffClient.setAuthToken(staffLogin.token);
    const result = await staffClient.get('/api/v1/admin/configs/bypass-time-window');
    assertStatus(result, 403, 'Staff không được truy cập admin config');
  });

  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  runAdminConfigTests().then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = runAdminConfigTests;

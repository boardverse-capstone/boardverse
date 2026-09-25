/**
 * Admin Moderation API Tests (Alerts, Cooling-off, Risk)
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

async function runAdminModerationTests() {
  const suite = new TestRunner('Admin Moderation API');
  const http = new HttpClient();

  let testUserId = '';
  let testAlertId = '';

  // Setup
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  suite.test('Setup: Lấy user alert để test', async () => {
    const result = await http.get('/api/v1/admin/users/alerts');
    const data = result.data?.data ?? result.data;
    if (Array.isArray(data) && data.length > 0) {
      testUserId = data[0].id || data[0].userId;
    }
    // Có thể không có user nào dưới ngưỡng - OK
  });

  // ============ Alerts ============
  suite.test('GET /api/v1/admin/alerts → 200', async () => {
    const result = await http.get('/api/v1/admin/alerts', {
      params: { pageNumber: 1, pageSize: 20 },
    });
    assertOk(result, 'List alerts thất bại');
    const items = result.data?.data?.items ?? result.data?.items ?? [];
    if (Array.isArray(items) && items.length > 0) {
      testAlertId = items[0].id;
    }
  });

  suite.test('GET /api/v1/admin/alerts filter status=Open', async () => {
    const result = await http.get('/api/v1/admin/alerts', {
      params: { status: 'Open' },
    });
    assertOk(result, 'Alerts filter Open thất bại');
  });

  suite.test('GET /api/v1/admin/alerts filter severity=Critical', async () => {
    const result = await http.get('/api/v1/admin/alerts', {
      params: { severity: 'Critical' },
    });
    assertOk(result, 'Alerts filter Critical thất bại');
  });

  // ============ Alert Metrics ============
  suite.test('GET /api/v1/admin/alerts/metrics → 200', async () => {
    const result = await http.get('/api/v1/admin/alerts/metrics');
    assertOk(result, 'Alert metrics thất bại');
  });

  // ============ Cooling Off ============
  suite.test('GET /api/v1/admin/cooling-off → 200', async () => {
    const result = await http.get('/api/v1/admin/cooling-off', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Cooling-off list thất bại');
  });

  // ============ Risk Lookup ============
  suite.test('GET /api/v1/admin/players/{userId}/risk → 200', async () => {
    if (!testUserId) {
      console.log('    ⚠ Không có user để test risk lookup, skip');
      return;
    }
    const result = await http.get(`/api/v1/admin/players/${testUserId}/risk`);
    assertOk(result, 'Player risk lookup thất bại');
  });

  suite.test('GET /api/v1/admin/players/{userId}/risk-history → 200', async () => {
    if (!testUserId) {
      console.log('    ⚠ Không có user để test risk history, skip');
      return;
    }
    const result = await http.get(`/api/v1/admin/players/${testUserId}/risk-history`);
    assertOk(result, 'Player risk history thất bại');
  });

  // ============ Punish User (skip actual call to avoid side effects) ============
  suite.test('POST punish với invalid userId → 400/404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await http.post(`/api/v1/admin/users/${fakeId}/punish`, {
      actionType: 'Warning',
      reason: 'Test from automated suite - invalid user',
    });
    assert(
      result.status === 400 || result.status === 404,
      `Expected 400/404, got ${result.status}`
    );
  });

  // ============ Adjust Karma (validation only) ============
  suite.test('POST adjust-karma với amount=0 → 400', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await http.post(`/api/v1/admin/users/${fakeId}/adjust-karma`, {
      amount: 0,
      reason: 'Test - amount 0 should fail',
    });
    assert(
      result.status === 400 || result.status === 404,
      `Expected 400/404, got ${result.status}`
    );
  });

  // ============ Authorization ============
  suite.test('Manager không truy cập cooling-off → 403', async () => {
    const mgrLogin = await login('manager', http);
    const mgrClient = new HttpClient();
    mgrClient.setAuthToken(mgrLogin.token);
    const result = await mgrClient.get('/api/v1/admin/cooling-off');
    assertStatus(result, 403, 'Manager không được truy cập cooling-off admin');
  });

  // ============ Run ============
  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  runAdminModerationTests().then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = runAdminModerationTests;

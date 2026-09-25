/**
 * Admin Settlements & Tournaments API Tests
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

async function runAdminSettlementsTests() {
  const suite = new TestRunner('Admin Settlements API');
  const http = new HttpClient();

  // Setup
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  // ============ Settlements ============
  suite.test('GET /api/v1/admin/settlements → 200', async () => {
    const result = await http.get('/api/v1/admin/settlements', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Settlements list thất bại');
  });

  suite.test('GET /api/v1/admin/settlements/failed → 200', async () => {
    const result = await http.get('/api/v1/admin/settlements/failed', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Settlements failed list thất bại');
  });

  // ============ Override ============
  suite.test('POST override settlement với invalid ID → 400/404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await http.post(`/api/v1/admin/settlements/${fakeId}/override`, {
      amount: 100000,
      reason: 'Test override from automated suite',
    });
    assert(
      result.status === 400 || result.status === 404,
      `Expected 400/404, got ${result.status}`
    );
  });

  // ============ Authorization ============
  suite.test('Staff không truy cập admin/settlements → 403', async () => {
    let staffLogin;
    try {
      staffLogin = await login('staff', http);
    } catch (err) {
      console.log('    ⚠ Staff login fail (rate limit hoặc chưa seed), skip');
      return;
    }
    const staffClient = new HttpClient();
    staffClient.setAuthToken(staffLogin.token);
    const result = await staffClient.get('/api/v1/admin/settlements');
    assertStatus(result, 403, 'Staff không được truy cập settlements');
  });

  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

async function runAdminTournamentsTests() {
  const suite = new TestRunner('Admin Tournaments API');
  const http = new HttpClient();

  let tournamentId = '';

  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  // ============ List Tournaments ============
  suite.test('GET /api/v1/admin/tournaments → 200', async () => {
    const result = await http.get('/api/v1/admin/tournaments', {
      params: { pageNumber: 1, pageSize: 20 },
    });
    assertOk(result, 'Tournaments list thất bại');
    const items = result.data?.data?.items ?? result.data?.items ?? [];
    if (Array.isArray(items) && items.length > 0) {
      tournamentId = items[0].id;
    }
  });

  suite.test('GET tournaments với status filter', async () => {
    const result = await http.get('/api/v1/admin/tournaments', {
      params: { status: 'Completed' },
    });
    assertOk(result, 'Tournaments status filter thất bại');
  });

  // ============ Tournament Detail ============
  suite.test('GET /api/v1/admin/tournaments/{id} → 200', async () => {
    if (!tournamentId) {
      console.log('    ⚠ Không có tournament để test detail, skip');
      return;
    }
    const result = await http.get(`/api/v1/admin/tournaments/${tournamentId}`);
    assertOk(result, 'Tournament detail thất bại');
  });

  suite.test('GET tournament detail với invalid ID → 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await http.get(`/api/v1/admin/tournaments/${fakeId}`);
    assertStatus(result, 404, 'Invalid tournament ID phải 404');
  });

  // ============ Tournament Participants ============
  suite.test('GET /api/v1/admin/tournaments/{id}/participants → 200', async () => {
    if (!tournamentId) {
      console.log('    ⚠ Không có tournament để test participants, skip');
      return;
    }
    const result = await http.get(`/api/v1/admin/tournaments/${tournamentId}/participants`);
    assertOk(result, 'Tournament participants thất bại');
  });

  // ============ Authorization ============
  suite.test('Manager không truy cập admin tournaments → 403', async () => {
    const mgrLogin = await login('manager', http);
    const mgrClient = new HttpClient();
    mgrClient.setAuthToken(mgrLogin.token);
    const result = await mgrClient.get('/api/v1/admin/tournaments');
    assertStatus(result, 403, 'Manager không được truy cập admin tournaments');
  });

  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  (async () => {
    const r1 = await runAdminSettlementsTests();
    const r2 = await runAdminTournamentsTests();
    const totalFailed = r1.failed + r2.failed;
    process.exit(totalFailed === 0 ? 0 : 1);
  })();
}

module.exports = { runAdminSettlementsTests, runAdminTournamentsTests };

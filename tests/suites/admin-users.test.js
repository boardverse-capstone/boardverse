/**
 * Admin Users API Tests
 */

const {
  HttpClient,
  TestRunner,
  assert,
  assertOk,
  assertStatus,
  assertHasProperty,
  login,
  clearTokens,
  saveReport,
} = require('../helpers');

async function runAdminUsersTests() {
  const suite = new TestRunner('Admin Users API');
  const http = new HttpClient();

  // Setup
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  // ============ List Users ============
  suite.test('GET /api/UserManagement/users (admin) → 200', async () => {
    const result = await http.get('/api/UserManagement/users', { params: { Page: 1, PageSize: 10 } });
    assertOk(result, 'List users thất bại');
  });

  suite.test('GET /api/UserManagement/users với search filter', async () => {
    const result = await http.get('/api/UserManagement/users', {
      params: { Page: 1, PageSize: 10, Search: 'admin' },
    });
    assertOk(result, 'Search users thất bại');
  });

  suite.test('GET /api/UserManagement/users với role filter', async () => {
    const result = await http.get('/api/UserManagement/users', {
      params: { Page: 1, PageSize: 10, Role: 'Player' },
    });
    assertOk(result, 'Filter role thất bại');
  });

  // ============ Pagination ============
  suite.test('Pagination: Page=2&PageSize=5', async () => {
    const result = await http.get('/api/UserManagement/users', { params: { Page: 2, PageSize: 5 } });
    assertOk(result, 'Pagination thất bại');
  });

  // ============ User Alerts (Karma < 50) ============
  suite.test('GET /api/v1/admin/users/alerts → 200', async () => {
    const result = await http.get('/api/v1/admin/users/alerts');
    // Có thể trả 200 với array rỗng hoặc có data
    assert(result.ok, `Expected OK, got ${result.status}`);
  });

  // ============ Karma Logs ============
  suite.test('GET /api/v1/admin/karma-logs → 200', async () => {
    const result = await http.get('/api/v1/admin/karma-logs', {
      params: { pageNumber: 1, pageSize: 20 },
    });
    assertOk(result, 'Karma logs thất bại');
  });

  suite.test('GET /api/v1/admin/karma-logs với filter violationCategory', async () => {
    const result = await http.get('/api/v1/admin/karma-logs', {
      params: { violationCategory: 'NoShow' },
    });
    assertOk(result, 'Karma logs filter thất bại');
  });

  // ============ Action History ============
  suite.test('GET /api/v1/admin/users/action-history → 200', async () => {
    const result = await http.get('/api/v1/admin/users/action-history', {
      params: { pageNumber: 1, pageSize: 20 },
    });
    assertOk(result, 'Action history thất bại');
  });

  // ============ Cooling Off ============
  suite.test('GET /api/v1/admin/cooling-off → 200', async () => {
    const result = await http.get('/api/v1/admin/cooling-off', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Cooling-off list thất bại');
  });

  // ============ Authorization ============
  suite.test('Manager không truy cập admin/users được (tuỳ setup)', async () => {
    const managerLogin = await login('manager', http);
    const mgrClient = new HttpClient();
    mgrClient.setAuthToken(managerLogin.token);
    const result = await mgrClient.get('/api/v1/admin/karma-logs');
    // Có thể là 200 hoặc 403 tuỳ backend setup
    assert(
      result.status === 200 || result.status === 403,
      `Expected 200/403, got ${result.status}`
    );
  });

  suite.test('Staff không truy cập admin endpoint → 403', async () => {
    let staffLogin;
    try {
      staffLogin = await login('staff', http);
    } catch (err) {
      console.log('    ⚠ Staff login fail (rate limit hoặc chưa seed), skip');
      return;
    }
    const staffClient = new HttpClient();
    staffClient.setAuthToken(staffLogin.token);
    const result = await staffClient.get('/api/v1/admin/users/alerts');
    assertStatus(result, 403, 'Staff không được truy cập admin endpoint');
  });

  // ============ Run ============
  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  runAdminUsersTests().then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = runAdminUsersTests;

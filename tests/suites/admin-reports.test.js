/**
 * Admin Reports API Tests
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

async function runAdminReportsTests() {
  const suite = new TestRunner('Admin Reports API');
  const http = new HttpClient();

  let cafeId = '';

  // Setup
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  suite.test('Setup: Lấy cafe ID đầu tiên', async () => {
    const list = await http.get('/api/v1/admin/cafes', { params: { pageSize: 1 } });
    cafeId = list.data?.data?.items?.[0]?.id || list.data?.items?.[0]?.id;
    // cafeId có thể rỗng - các test sau sẽ skip nếu cần
  });

  // ============ Overview ============
  suite.test('GET /api/v1/admin/reports/overview → 200', async () => {
    const result = await http.get('/api/v1/admin/reports/overview');
    assertOk(result, 'Reports overview thất bại');
    const data = result.data?.data ?? result.data;
    assert(data, 'Response phải có data');
  });

  // ============ Lobby Failures ============
  suite.test('GET /api/v1/admin/reports/lobby-failures → 200', async () => {
    const result = await http.get('/api/v1/admin/reports/lobby-failures', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Lobby failures thất bại');
  });

  suite.test('GET lobby-failures với filter failureType', async () => {
    const result = await http.get('/api/v1/admin/reports/lobby-failures', {
      params: { failureType: 'TimeoutFailed' },
    });
    assertOk(result, 'Lobby failures filter thất bại');
  });

  suite.test('GET lobby-failures với date range', async () => {
    const fromUtc = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toUtc = new Date().toISOString();
    const result = await http.get('/api/v1/admin/reports/lobby-failures', {
      params: { fromUtc, toUtc },
    });
    assertOk(result, 'Lobby failures date range thất bại');
  });

  // ============ Deposits ============
  suite.test('GET /api/v1/admin/reports/deposits → 200', async () => {
    const result = await http.get('/api/v1/admin/reports/deposits', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Deposits report thất bại');
  });

  suite.test('GET deposits với status filter', async () => {
    const result = await http.get('/api/v1/admin/reports/deposits', {
      params: { status: 'Pending' },
    });
    assertOk(result, 'Deposits status filter thất bại');
  });

  // ============ Cafe Performance ============
  suite.test('GET /api/v1/admin/reports/cafe-performance → 200', async () => {
    const result = await http.get('/api/v1/admin/reports/cafe-performance', {
      params: { page: 1, pageSize: 20 },
    });
    assertOk(result, 'Cafe performance thất bại');
  });

  suite.test('GET cafe-performance với sort=revenue', async () => {
    const result = await http.get('/api/v1/admin/reports/cafe-performance', {
      params: { sortBy: 'revenue', sortOrder: 'desc' },
    });
    assertOk(result, 'Cafe performance sort thất bại');
  });

  // ============ Authorization ============
  suite.test('Staff không truy cập reports → 403', async () => {
    let staffLogin;
    try {
      staffLogin = await login('staff', http);
    } catch (err) {
      console.log('    ⚠ Staff login fail (rate limit hoặc chưa seed), skip');
      return;
    }
    const staffClient = new HttpClient();
    staffClient.setAuthToken(staffLogin.token);
    const result = await staffClient.get('/api/v1/admin/reports/overview');
    assertStatus(result, 403, 'Staff không được truy cập reports admin');
  });

  // ============ Run ============
  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  runAdminReportsTests().then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = runAdminReportsTests;

/**
 * Admin Cafe API Tests
 */

const {
  HttpClient,
  TestRunner,
  assert,
  assertOk,
  assertStatus,
  assertHasProperty,
  assertArray,
  login,
  clearTokens,
  saveReport,
} = require('../helpers');

async function runAdminCafesTests() {
  const suite = new TestRunner('Admin Cafes API');
  const http = new HttpClient();

  // Setup: login as admin
  suite.test('Setup: Login admin', async () => {
    const loginResult = await login('admin', http);
    http.setAuthToken(loginResult.token);
  });

  // ============ List Cafes ============
  suite.test('GET /api/v1/admin/cafes → 200', async () => {
    const result = await http.get('/api/v1/admin/cafes');
    assertOk(result, 'Lấy danh sách cafe thất bại');
    const data = result.data?.data ?? result.data;
    assert(data, 'Response phải có data');
  });

  suite.test('GET /api/v1/admin/cafes với filter status', async () => {
    const result = await http.get('/api/v1/admin/cafes', {
      params: { status: 'ACTIVE' },
    });
    assertOk(result, 'Filter theo status thất bại');
  });

  suite.test('GET /api/v1/admin/cafes với pagination', async () => {
    const result = await http.get('/api/v1/admin/cafes', {
      params: { page: 1, pageSize: 5 },
    });
    assertOk(result, 'Pagination thất bại');
  });

  // ============ Operational Status ============
  suite.test('PUT /api/v1/admin/cafes/{id}/operational-status → 200', async () => {
    // Lấy cafe đầu tiên để test
    const list = await http.get('/api/v1/admin/cafes', { params: { pageSize: 1 } });
    const cafeId = list.data?.data?.items?.[0]?.id || list.data?.items?.[0]?.id;

    if (!cafeId) {
      console.log('    ⚠ Không có cafe nào để test, skip');
      return;
    }

    const result = await http.put(
      `/api/v1/admin/cafes/${cafeId}/operational-status`,
      { status: 'ACTIVE', reason: 'Test from automated suite' }
    );
    assertOk(result, 'Cập nhật operational status thất bại');
  });

  suite.test('PUT operational-status với cafeId không tồn tại → 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await http.put(
      `/api/v1/admin/cafes/${fakeId}/operational-status`,
      { status: 'INACTIVE' }
    );
    assert(
      result.status === 404 || result.status === 400,
      `Expected 404/400, got ${result.status}`
    );
  });

  // ============ Authorization ============
  suite.test('Staff không được truy cập admin/cafes → 403', async () => {
    let staffLogin;
    try {
      staffLogin = await login('staff', http);
    } catch (err) {
      console.log('    ⚠ Staff login fail (rate limit hoặc chưa seed), skip');
      return;
    }
    const staffClient = new HttpClient();
    staffClient.setAuthToken(staffLogin.token);
    const result = await staffClient.get('/api/v1/admin/cafes');
    assertStatus(result, 403, 'Staff không được truy cập admin endpoint');
  });

  // ============ Run ============
  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  runAdminCafesTests().then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = runAdminCafesTests;

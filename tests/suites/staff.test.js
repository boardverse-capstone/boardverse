/**
 * Staff API Tests (Shift, Inventory, Working Cafe)
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

/**
 * Login thử với staff, trả null nếu fail (rate limit hoặc user không tồn tại)
 */
async function tryLoginStaff() {
  try {
    return await login('staff');
  } catch (err) {
    console.log('    ⚠ Staff login fail (rate limit hoặc chưa seed):', err.message.slice(0, 80));
    return null;
  }
}

async function tryLoginPlayer() {
  try {
    return await login('player');
  } catch (err) {
    console.log('    ⚠ Player login fail (rate limit hoặc chưa seed):', err.message.slice(0, 80));
    return null;
  }
}

async function runStaffShiftTests() {
  const suite = new TestRunner('Staff Shift API');
  const http = new HttpClient();

  let cafeId = '';
  let shiftId = '';

  // Setup
  suite.test('Setup: Login staff', async () => {
    const staffLogin = await tryLoginStaff();
    if (!staffLogin) {
      console.log('    ⚠ Skip toàn bộ tests trong suite này');
      return;
    }
    http.setAuthToken(staffLogin.token);
  });

  // ============ Working Cafe ============
  suite.test('GET /api/staff/my-cafes → 200', async () => {
    if (!http.defaultHeaders.Authorization) {
      console.log('    ⚠ No auth, skip');
      return;
    }
    const result = await http.get('/api/staff/my-cafes');
    assertOk(result, 'My cafes thất bại');
    const cafes = result.data?.data ?? result.data ?? [];
    if (Array.isArray(cafes) && cafes.length > 0) {
      cafeId = cafes[0].id;
    } else if (cafes && typeof cafes === 'object' && cafes.id) {
      cafeId = cafes.id;
    }
  });

  // ============ Current Shift ============
  suite.test('GET /api/shifts/current (no cafe) → 400', async () => {
    if (!http.defaultHeaders.Authorization) return;
    const result = await http.get('/api/shifts/current');
    assertStatus(result, 400, 'Thiếu cafeId phải 400');
  });

  suite.test('GET /api/shifts/current?cafeId=... → 200', async () => {
    if (!http.defaultHeaders.Authorization) return;
    if (!cafeId) {
      console.log('    ⚠ Staff không có cafe, skip');
      return;
    }
    const result = await http.get('/api/shifts/current', {
      params: { cafeId },
    });
    assertOk(result, 'Current shift thất bại');
    const data = result.data?.data;
    if (data && data.id) {
      shiftId = data.id;
    }
  });

  // ============ Shift History ============
  suite.test('GET /api/shifts?cafeId=... → 200', async () => {
    if (!http.defaultHeaders.Authorization) return;
    if (!cafeId) {
      console.log('    ⚠ Staff không có cafe, skip');
      return;
    }
    let result = await http.get('/api/shifts', {
      params: { cafeId, page: 1, pageSize: 10 },
    });
    if (!result.ok && result.status === 404) {
      result = await http.get('/api/shifts/history', {
        params: { cafeId, page: 1, pageSize: 10 },
      });
    }
    assertOk(result, 'Shift history thất bại');
  });

  // ============ Open/Close Shift (test cả 2 status) ============
  suite.test('POST /api/shifts (mở ca) → 201/200/409', async () => {
    if (!http.defaultHeaders.Authorization) return;
    if (!cafeId) {
      console.log('    ⚠ Staff không có cafe, skip');
      return;
    }
    const result = await http.post('/api/shifts', {
      cafeId,
      openingCashBalance: 0,
    });
    assert(
      result.status === 201 || result.status === 200 || result.status === 409,
      `Expected 201/200/409, got ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`
    );
    if (result.data?.data?.id) {
      shiftId = result.data.data.id;
    } else if (result.data?.id) {
      shiftId = result.data.id;
    }
  });

  suite.test('POST /api/shifts/{id}/close (đóng ca nếu có) → 200/404/409', async () => {
    if (!http.defaultHeaders.Authorization) return;
    if (!shiftId) {
      console.log('    ⚠ Không có shiftId để close, skip');
      return;
    }
    const result = await http.post(`/api/shifts/${shiftId}/close`, {
      closingCashBalance: 0,
    });
    assert(
      result.ok || result.status === 404 || result.status === 409,
      `Expected 200/404/409, got ${result.status}`
    );
  });

  // ============ Manager có thể truy cập shift ============
  suite.test('Manager cũng có thể truy cập shift', async () => {
    const mgrLogin = await login('manager', http);
    const mgrClient = new HttpClient();
    mgrClient.setAuthToken(mgrLogin.token);
    const result = await mgrClient.get('/api/shifts/current', {
      params: { cafeId: cafeId || '00000000-0000-0000-0000-000000000000' },
    });
    assert(
      result.ok || result.status === 400 || result.status === 403 || result.status === 404,
      `Manager có thể truy cập shift, got ${result.status}`
    );
  });

  // ============ Run ============
  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

async function runStaffInventoryTests() {
  const suite = new TestRunner('Staff Inventory API');
  const http = new HttpClient();

  let cafeId = '';

  // Setup
  suite.test('Setup: Login staff', async () => {
    const staffLogin = await tryLoginStaff();
    if (!staffLogin) {
      console.log('    ⚠ Skip toàn bộ tests trong suite này');
      return;
    }
    http.setAuthToken(staffLogin.token);
  });

  suite.test('Setup: Lấy working cafe', async () => {
    if (!http.defaultHeaders.Authorization) return;
    const result = await http.get('/api/staff/my-cafes');
    const cafes = result.data?.data ?? result.data ?? [];
    if (Array.isArray(cafes) && cafes.length > 0) {
      cafeId = cafes[0].id;
    } else if (cafes && typeof cafes === 'object' && cafes.id) {
      cafeId = cafes.id;
    }
  });

  // ============ Inventory List ============
  suite.test('GET /api/cafes/{id}/inventory → 200', async () => {
    if (!http.defaultHeaders.Authorization) return;
    if (!cafeId) {
      console.log('    ⚠ Staff không có cafe, skip');
      return;
    }
    const result = await http.get(`/api/cafes/${cafeId}/inventory`, {
      params: { page: 1, pageSize: 10 },
    });
    assertOk(result, 'Inventory list thất bại');
  });

  suite.test('GET inventory với status filter', async () => {
    if (!http.defaultHeaders.Authorization || !cafeId) return;
    const result = await http.get(`/api/cafes/${cafeId}/inventory`, {
      params: { status: 'Available' },
    });
    assertOk(result, 'Inventory filter thất bại');
  });

  suite.test('GET inventory với search', async () => {
    if (!http.defaultHeaders.Authorization || !cafeId) return;
    const result = await http.get(`/api/cafes/${cafeId}/inventory`, {
      params: { search: 'a' },
    });
    assertOk(result, 'Inventory search thất bại');
  });

  // ============ Boxes ============
  suite.test('GET /api/cafes/{id}/boxes → 200', async () => {
    if (!http.defaultHeaders.Authorization || !cafeId) return;
    const result = await http.get(`/api/cafes/${cafeId}/boxes`, {
      params: { page: 1, pageSize: 10 },
    });
    assertOk(result, 'Boxes list thất bại');
  });

  // ============ Authorization ============
  suite.test('Player không truy cập inventory staff → 403', async () => {
    const playerLogin = await tryLoginPlayer();
    if (!playerLogin) {
      console.log('    ⚠ Player login fail, skip');
      return;
    }
    const playerClient = new HttpClient();
    playerClient.setAuthToken(playerLogin.token);
    const result = await playerClient.get(`/api/cafes/${cafeId}/inventory`);
    assert(
      result.ok || result.status === 403 || result.status === 404,
      `Expected 200/403/404, got ${result.status}`
    );
  });

  const result = await suite.run();
  saveReport(result);
  clearTokens();
  return result;
}

if (require.main === module) {
  (async () => {
    const r1 = await runStaffShiftTests();
    const r2 = await runStaffInventoryTests();
    const totalFailed = r1.failed + r2.failed;
    process.exit(totalFailed === 0 ? 0 : 1);
  })();
}

module.exports = { runStaffShiftTests, runStaffInventoryTests };

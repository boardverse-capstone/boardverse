# BoardVerse API Tests

API integration tests cho các endpoint Admin/Staff trên BoardVerse.

## Cấu trúc

```
tests/
├── package.json          # Test runner config
├── config.js             # Shared config (base URL, test users)
├── helpers.js            # HTTP helpers, auth helpers
├── run.js                # Main test runner
├── suites/
│   ├── auth.test.js      # Authentication flow
│   ├── admin-cafes.test.js    # Admin Cafe CRUD
│   ├── admin-users.test.js    # Admin User Management
│   ├── admin-reports.test.js  # Admin Reports
│   ├── admin-moderation.test.js  # Admin Moderation
│   ├── admin-settlements.test.js  # Admin Settlements
│   ├── admin-tournaments.test.js  # Admin Tournaments
│   ├── admin-config.test.js     # Admin Config (bypass/demo)
│   ├── staff-shift.test.js      # Staff Shift Management
│   ├── staff-inventory.test.js  # Staff Inventory
│   └── staff-cafe.test.js       # Staff Cafe
├── results/              # Test output (gitignored)
└── README.md
```

## Chạy tests

```bash
# Cài dependencies (1 lần)
npm install

# Chạy tất cả tests
npm test

# Chạy 1 suite
npm run test:auth
npm run test:admin-cafes
...

# Chạy với output chi tiết
npm run test:verbose
```

## Test Users

Test users mặc định (cấu hình trong `config.js`):

| Role | Username | Password |
|------|----------|----------|
| Admin | admin@boardverse.dev | Admin@123 |
| Manager | manager@boardverse.dev | Manager@123 |
| Staff | staff@boardverse.dev | Staff@123 |

Có thể override qua env: `TEST_ADMIN_EMAIL`, `TEST_MANAGER_EMAIL`, `TEST_STAFF_EMAIL`.

## Test Coverage

### Auth
- POST /api/auth/login (admin/manager/staff)
- POST /api/auth/refresh-token
- POST /api/auth/logout
- GET /api/auth/me (nếu có)
- 401 handling (sai password, expired token)

### Admin
- Cafes: list, detail, update operational status
- Users: list, detail, block/unblock
- Reports: overview, lobby failures, deposits, cafe performance
- Moderation: alerts, cooling-off, risk lookup
- Settlements: list, override
- Tournaments: list, detail
- Config: bypass time-window, demo loosen
- Wallet: list, detail, transactions

### Staff
- Shift: current, history, open, close
- Inventory: list, detail
- Working cafe: my-cafes

## Output

Test results ghi vào `results/` dưới dạng:
- `results/<timestamp>.json` - Full report
- `results/<timestamp>-<suite>.txt` - Per-suite log

/**
 * Test configuration
 */

module.exports = {
  // Base URL của backend API
  // - Local: http://localhost:5022
  // - Production: https://boardverse-server.onrender.com
  baseUrl: process.env.TEST_API_BASE_URL || 'https://boardverse-server.onrender.com',

  // Timeout cho mỗi request (ms)
  requestTimeout: 15000,

  // Test users (override qua env nếu cần)
  users: {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@boardverse.dev',
      password: process.env.TEST_ADMIN_PASSWORD || 'Admin@123',
    },
    manager: {
      email: process.env.TEST_MANAGER_EMAIL || 'manager@boardverse.dev',
      password: process.env.TEST_MANAGER_PASSWORD || 'Manager@123',
    },
    staff: {
      email: process.env.TEST_STAFF_EMAIL || 'staff@boardverse.dev',
      password: process.env.TEST_STAFF_PASSWORD || 'Staff@123',
    },
    player: {
      email: process.env.TEST_PLAYER_EMAIL || 'player@boardverse.dev',
      password: process.env.TEST_PLAYER_PASSWORD || 'Player@123',
    },
  },

  // Test data IDs (override qua env khi cần)
  ids: {
    // Cafe IDs để test detail/list
    testCafeId: process.env.TEST_CAFE_ID || '',
    // User IDs để test detail
    testUserId: process.env.TEST_USER_ID || '',
    // Tournament ID
    testTournamentId: process.env.TEST_TOURNAMENT_ID || '',
  },

  // HTTP status code constants
  http: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Headers mặc định
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

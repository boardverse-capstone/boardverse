/**
 * Main test runner - chạy tất cả suites
 */

const fs = require('fs');
const path = require('path');

const suites = {
  auth: require('./suites/auth.test.js'),
  'admin-cafes': require('./suites/admin-cafes.test.js'),
  'admin-users': require('./suites/admin-users.test.js'),
  'admin-reports': require('./suites/admin-reports.test.js'),
  'admin-moderation': require('./suites/admin-moderation.test.js'),
  'admin-settlements': require('./suites/admin-settlements-tournaments.test.js')
    .runAdminSettlementsTests,
  'admin-tournaments': require('./suites/admin-settlements-tournaments.test.js')
    .runAdminTournamentsTests,
  'admin-config': require('./suites/admin-config.test.js'),
  'staff-shift': require('./suites/staff.test.js').runStaffShiftTests,
  'staff-inventory': require('./suites/staff.test.js').runStaffInventoryTests,
};

async function runAll(filter = null) {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   BoardVerse API Integration Tests    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\x1b[0m');

  const config = require('./config');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Suites: ${Object.keys(suites).join(', ')}\n`);

  const allResults = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSuites = 0;

  for (const [name, suiteFn] of Object.entries(suites)) {
    if (filter && !name.includes(filter)) continue;
    try {
      totalSuites++;
      const result = await suiteFn();
      allResults.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;
    } catch (err) {
      console.error(`\x1b[31mSuite ${name} crashed: ${err.message}\x1b[0m`);
    }
  }

  // ============ Summary ============
  console.log('\n');
  console.log('\x1b[1m\x1b[36m══════════════════ SUMMARY ══════════════════\x1b[0m');
  console.log(`\x1b[1mSuites: ${totalSuites}\x1b[0m`);

  for (const result of allResults) {
    const status = result.failed === 0 ? '\x1b[32m✓' : '\x1b[31m✗';
    console.log(`${status}\x1b[0m ${result.suite.padEnd(30)} ${result.passed}/${result.total} passed (${result.duration}ms)`);
  }

  console.log('');
  const passedColor = totalFailed === 0 ? '\x1b[32m' : '\x1b[31m';
  console.log(`${passedColor}TOTAL: ${totalPassed} passed, ${totalFailed} failed\x1b[0m`);

  // Save combined report
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(resultsDir, `${timestamp}-combined.json`);
  fs.writeFileSync(
    reportFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: config.baseUrl,
        summary: {
          suites: totalSuites,
          passed: totalPassed,
          failed: totalFailed,
        },
        suites: allResults,
      },
      null,
      2
    )
  );

  console.log(`\nReport: ${reportFile}\n`);

  return { passed: totalPassed, failed: totalFailed, suites: allResults };
}

if (require.main === module) {
  const filter = process.argv[2] || null;
  runAll(filter).then((r) => {
    process.exit(r.failed === 0 ? 0 : 1);
  });
}

module.exports = { runAll };

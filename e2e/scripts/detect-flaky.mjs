import fs from 'fs';
import path from 'path';

const reportPath = path.resolve('playwright-report/results.json');

if (!fs.existsSync(reportPath)) {
  console.log('No Playwright report found.');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const flakyTests = [];
const brokenTests = [];

function processSuite(suite) {
  if (suite.specs) {
    suite.specs.forEach(spec => {
      spec.tests.forEach(test => {
        const hasPassed = test.results.some(r => r.status === 'expected' || r.status === 'passed');
        const hasFailed = test.results.some(r => r.status === 'failed' || r.status === 'timedOut');
        
        if (hasPassed && hasFailed) {
          flakyTests.push({
            title: spec.title,
            file: spec.file,
            retries: test.results.length - 1
          });
        } else if (!hasPassed && hasFailed) {
          brokenTests.push({
            title: spec.title,
            file: spec.file
          });
        }
      });
    });
  }
  if (suite.suites) {
    suite.suites.forEach(processSuite);
  }
}

processSuite(report);

if (flakyTests.length > 0) {
  console.log('\n### ⚠️ Flaky Tests Detected (Playwright)');
  console.log('| Test | File | Retries |');
  console.log('| --- | --- | --- |');
  flakyTests.forEach(t => {
    console.log(`| ${t.title} | ${t.file} | ${t.retries} |`);
  });
  
  // Create a quarantine list for future reference or automated skipping
  fs.writeFileSync('quarantine-playwright.json', JSON.stringify(flakyTests, null, 2));
}

if (brokenTests.length > 0) {
  console.log('\n### ❌ Broken Tests (Failed all retries)');
  brokenTests.forEach(t => {
    console.log(`- ${t.title} (${t.file})`);
  });
}

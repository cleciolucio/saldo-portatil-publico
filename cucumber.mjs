import { mkdirSync } from 'node:fs';
mkdirSync('reports/cucumber', { recursive: true });
const report = process.argv.includes('--dry-run')
  ? 'web-dry'
  : process.env.BDD_REPORT_NAME || 'web';
export default {
  paths: ['tests/bdd/features/**/*.feature'],
  import: ['tests/bdd/support/**/*.mjs', 'tests/bdd/steps/**/*.mjs'],
  format: [
    'progress',
    `html:reports/cucumber/${report}.html`,
    `json:reports/cucumber/${report}.json`,
    `junit:reports/cucumber/${report}.xml`,
  ],
  parallel: 1,
  failFast: false,
};

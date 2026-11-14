import { mkdirSync } from 'node:fs';
mkdirSync('reports/cucumber', { recursive: true });
const report = process.argv.includes('--dry-run')
  ? 'mobile-dry'
  : 'native-' + (process.env.MOBILE_PLATFORM || 'mobile');
export default {
  paths: ['tests/mobile/features/**/*.feature'],
  import: ['tests/mobile/support/**/*.mjs', 'tests/mobile/steps/**/*.mjs'],
  format: [
    'progress',
    `html:reports/cucumber/${report}.html`,
    `json:reports/cucumber/${report}.json`,
    `junit:reports/cucumber/${report}.xml`,
  ],
  parallel: 1,
};

/**
 * Self-check: redaction must strip bearer/api-key/exchange-code style secrets.
 * Run: bun scripts/check-process-validator.mjs
 */
import { redactCliArgs, redactSecrets } from '../src/lib/modules/redact-secrets.ts';

const samples = [
  'Authorization: Bearer eg1~abc.def.ghi',
  'x-api-key: secret-value-here',
  'failed with device_auth missing',
  'normal error without secrets',
  'grant_type=exchange_code&exchange_code=deadbeefcafebabe',
  'access_token=eyJhbGciOi.fake.token'
];

for (const sample of samples.slice(0, 3)) {
  const out = redactSecrets(sample);
  if (/bearer\s+[a-z0-9]/i.test(out) || /secret-value-here/i.test(out) || /eg1~/i.test(out)) {
    console.error('FAIL redaction leaked:', sample, '→', out);
    process.exit(1);
  }
}

if (!redactSecrets(samples[3]).includes('normal error')) {
  console.error('FAIL over-redacted normal text');
  process.exit(1);
}

if (/deadbeefcafebabe/i.test(redactSecrets(samples[4]))) {
  console.error('FAIL exchange_code leaked');
  process.exit(1);
}

if (/eyJhbGci/i.test(redactSecrets(samples[5]))) {
  console.error('FAIL access_token leaked');
  process.exit(1);
}

const args = redactCliArgs(['auth', '--token', 'live-exchange-code', '--json']);
if (args.includes('live-exchange-code') || !args.includes('[REDACTED]')) {
  console.error('FAIL CLI token leaked:', args);
  process.exit(1);
}

console.log('process-validator redaction ok');

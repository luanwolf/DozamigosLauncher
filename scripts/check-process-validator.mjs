/**
 * Self-check: redaction must strip bearer/api-key style secrets.
 * Run: bun scripts/check-process-validator.mjs
 */
const SECRET_RE =
  /(authorization|bearer\s+[a-z0-9._~+/=-]+|eg1~[a-z0-9]+|device[_-]?auth|x-api-key\s*[:=]\s*\S+|api[_-]?key\s*[:=]\s*\S+)/gi;

function redactSecrets(text) {
  return text.replace(SECRET_RE, '[REDACTED]');
}

const samples = [
  'Authorization: Bearer eg1~abc.def.ghi',
  'x-api-key: secret-value-here',
  'failed with device_auth missing',
  'normal error without secrets'
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

console.log('process-validator redaction ok');

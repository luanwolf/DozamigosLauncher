import { resolveConfirmClick } from '@/confirm';

const userId = '111';
const other = '222';

const missing = resolveConfirmClick('ok:dead', userId);
if (missing.ok) throw new Error('missing should fail');

const malformed = resolveConfirmClick('x', userId);
if (malformed.ok || malformed.reason !== 'malformed') throw new Error('malformed');

const { rememberConfirm, nonce } = await import('@/confirm');
const id = nonce();
rememberConfirm(id, userId, async () => 'ok');

const wrong = resolveConfirmClick(`ok:${id}`, other);
if (wrong.ok || wrong.reason !== 'wrong-user') throw new Error('wrong-user');

const ok = resolveConfirmClick(`ok:${id}`, userId);
if (!ok.ok || ok.kind !== 'ok') throw new Error('owner should pass');

const expired = resolveConfirmClick(`ok:${id}`, userId, Date.now() + 120_000);
if (expired.ok) throw new Error('expired should fail after TTL? (first click consumed map in handler, not here)');

process.stdout.write('confirm.selfcheck ok\n');

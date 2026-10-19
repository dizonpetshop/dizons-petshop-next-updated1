import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {prisma} from './prisma';
import {createSessionToken, sessionCookieName, type SessionPayload} from './session';

export const rememberCookieName = 'petshop_remember';
export const rememberSeconds = 30 * 24 * 60 * 60;
export const authCookieOptions = {httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/'};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function secret() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET is required.');
  return process.env.AUTH_SECRET;
}
const version = (password: string) => createHmac('sha256', secret()).update(password).digest('hex');
const successor = (token: string) => createHmac('sha256', secret()).update('remember-rotation:' + token).digest('hex');
function parse(value?: string) {
  if (!value || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return null;
  const [id, token] = value.split('.');
  return {id, token};
}
export function cookieValue(request: Request, name: string) {
  return (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1);
}
export async function revokeRemember(value?: string) {
  const parsed = parse(value);
  if (!parsed) return;
  // Require possession of a current or grace-period credential to revoke this device.
  const digest = hash(parsed.token);
  await prisma.$executeRaw`UPDATE remember_credentials SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ${parsed.id} AND (token_hash = ${digest} OR (previous_hash = ${digest} AND previous_until > UTC_TIMESTAMP(3)))`;
}
export function clearRemember(response: NextResponse) {
  response.cookies.set(rememberCookieName, '', {...authCookieOptions, maxAge: 0});
}
export async function configureRemember(request: Request, response: NextResponse, userId: number, enabled: boolean) {
  await revokeRemember(cookieValue(request, rememberCookieName));
  clearRemember(response);
  if (!enabled) return;
  const user = await prisma.user.findUniqueOrThrow({where: {id: userId}});
  if (user.accountStatus !== 'Active') throw new Error('Account unavailable.');
  const id = randomBytes(32).toString('hex'), token = randomBytes(32).toString('hex');
  const digest = hash(token), credentialVersion = version(user.password);
  const expires = new Date(Date.now() + rememberSeconds * 1000);
  await prisma.$executeRaw`INSERT INTO remember_credentials (id, user_id, token_hash, credential_version, role, created_at, expires_at) VALUES (${id}, ${userId}, ${digest}, ${credentialVersion}, ${user.role}, UTC_TIMESTAMP(3), ${expires})`;
  response.cookies.set(rememberCookieName, id + '.' + token, {...authCookieOptions, expires});
}
type Credential = {id: string; user_id: number; token_hash: string; previous_hash: string | null; previous_until: Date | null; credential_version: string; role: SessionPayload['role']; expires_at: Date; revoked_at: Date | null};
export async function restoreRemember(value?: string) {
  const parsed = parse(value);
  if (!parsed) return null;
  return prisma.$transaction(async tx => {
    // Serialize rotations per device. Concurrent requests using the old token
    // receive the same successor for 60 seconds, without extending the deadline.
    const rows = await tx.$queryRaw<Credential[]>`SELECT * FROM remember_credentials WHERE id = ${parsed.id} FOR UPDATE`;
    const row = rows[0];
    if (!row || row.revoked_at || row.expires_at.getTime() <= Date.now()) return null;
    const digest = hash(parsed.token);
    const matches = (candidate: string | null) => !!candidate && timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(candidate, 'hex'));
    const current = matches(row.token_hash);
    const previous = matches(row.previous_hash) && !!row.previous_until && row.previous_until.getTime() > Date.now();
    if (!current && !previous) return null;
    const user = await tx.user.findUnique({where: {id: row.user_id}});
    if (!user || user.accountStatus !== 'Active' || user.role !== row.role || version(user.password) !== row.credential_version) {
      await tx.$executeRaw`UPDATE remember_credentials SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ${row.id}`;
      return null;
    }
    let next = parsed.token;
    if (previous) next = successor(parsed.token);
    else if (!row.previous_until || row.previous_until.getTime() <= Date.now()) {
      next = successor(parsed.token);
      await tx.$executeRaw`UPDATE remember_credentials SET previous_hash = token_hash, previous_until = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 60 SECOND), token_hash = ${hash(next)} WHERE id = ${row.id}`;
    }
    await tx.$executeRaw`UPDATE remember_credentials SET last_used_at = UTC_TIMESTAMP(3) WHERE id = ${row.id}`;
    const session: SessionPayload = {userId: user.id, role: row.role, name: [user.firstName, user.surname].filter(Boolean).join(' ') || 'User'};
    return {session, value: row.id + '.' + next, expires: row.expires_at};
  });
}
export async function restoredSessionToken(session: SessionPayload, credential: {value: string; expires: Date}) { return createSessionToken(session, {id: credential.value.split('.')[0], expires: credential.expires}); }
export function setSessionCookie(response: NextResponse, token: string) {
  // No Max-Age or Expires: ordinary login ends with the browser session.
  response.cookies.set(sessionCookieName, token, authCookieOptions);
  response.headers.set('Cache-Control', 'private, no-store');
}

import {readFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const db = new PrismaClient();
try {
  await db.$executeRawUnsafe(await readFile(new URL('../database/remember-me.sql', import.meta.url), 'utf8'));
  const triggers = await db.$queryRaw`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'users_revoke_remember'`;
  if (!triggers.length) {
    // MariaDB does not support CREATE TRIGGER in prepared statements. Use the
    // native client for this migration, keeping passwords out of process args.
    const url = new URL(process.env.DATABASE_URL);
    const client = process.env.MYSQL_CLIENT || (existsSync('C:/xampp/mysql/bin/mysql.exe') ? 'C:/xampp/mysql/bin/mysql.exe' : 'mysql');
    execFileSync(client, ['--host', url.hostname, '--port', url.port || '3306', '--user', decodeURIComponent(url.username), '--database', url.pathname.slice(1), '--execute', await readFile(new URL('../database/remember-revocation-trigger.sql', import.meta.url), 'utf8')], {env: {...process.env, MYSQL_PWD: decodeURIComponent(url.password)}, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  }
  console.log('Remember Me storage ready; existing accounts preserved.');
} finally { await db.$disconnect(); }

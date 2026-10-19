# Remember Me implementation

The Next.js login portals now support an optional, fixed 30-day persistent login.
Existing PHP sessions remain separate; their login UI has not been changed.
Database password, role and suspension changes from either application revoke
the Next.js persistent credentials through a database trigger.

## Changed files

- `src/lib/remember.ts`: generates device-specific random credentials, stores
  SHA-256 token hashes, validates accounts, rotates credentials under a row lock,
  and issues HttpOnly/SameSite=Lax cookies (Secure in production).
- `src/lib/session.ts`: keeps existing signed eight-hour sessions, with fresh
  random session identifiers; restored sessions are bound to their persistent
  record and capped by its original expiry.
- `src/proxy.ts`: restores authentication before protected pages/APIs execute,
  passes the restored session cookie to the request, and redirects returning
  customers and staff to their authorized dashboard. Login/logout and OAuth
  handlers manage credentials themselves.
- `src/app/api/auth/{client-login,admin-login,superadmin-login}/route.ts`:
  handles checkbox selection and clears/revokes an old browser credential on
  successful login without Remember Me. Ordinary login cookies have no Expires
  or Max-Age, while their signed sessions retain the existing eight-hour limit.
- `src/app/api/auth/logout/route.ts`: revokes both the current signed session and
  this browser's persistent credential, clears both cookies, redirects to login.
- `src/app/api/auth/google/callback/route.ts`: preserves existing Google flow and
  eight-hour session behavior; successful Google login clears an old Remember Me
  credential without creating a new persistent credential.
- `src/app/{client,admin,superadmin}/login/page.tsx`, `src/components/LoginSubmit.tsx`,
  `src/app/globals.css`: accessible labelled checkbox, customer recovery link on
  the same row, pending button state, existing colors and responsive layout.
- `prisma/schema.prisma`: describes the new credential table and user relation.
- `database/remember-me.sql`: additive credential table with a user foreign key,
  expiry, creation, last-use and revocation timestamps, current/previous token
  hashes, account credential fingerprint and role.
- `database/remember-revocation-trigger.sql`: revokes all devices after password
  or role changes or suspension, even if the account is later reactivated.
- `scripts/ensure-remember.mjs`, `scripts/ensure-mysql-operations.mjs`,
  `scripts/check-database.mjs`, `package.json`: migration and verification commands.
- `scripts/test-remember.mjs`: isolated real MySQL/HTTP authentication tests.

## Migration and deployment

The migration has been applied to the local database. Existing accounts and shop
data are preserved. On another installation, configure `.env.local` then run:

```powershell
npm.cmd run db:remember
npm.cmd run db:check
```

The general `db:upgrade` also includes this migration. The installer needs the
MySQL CLI (`MYSQL_CLIENT` may specify its path) and CREATE/TRIGGER privileges;
XAMPP's client is detected automatically on this machine. The database trigger
must be installed; the database check verifies its presence. Prisma migrations
alone do not capture triggers. Use HTTPS in production and a stable, private
AUTH_SECRET of at least 32 characters. Production cookies are Secure.

Credentials have an absolute 30-day expiry, not a sliding renewal. On restoration,
the current token rotates to a server-derived successor; concurrent requests
using its predecessor get the same successor for 60 seconds. Requests with the
current token during that window do not rotate it again. Only hashes are stored.
The brief grace period deliberately permits concurrent legitimate requests.
Logout revokes the entire device record, including the grace-period token.

No passwords or authentication tokens are stored in browser JavaScript storage.
Browser session restoration is ultimately browser-controlled: some browsers
restore ordinary session cookies when reopening tabs. Without Remember Me, the
server never issues a persistent credential or extends the eight-hour session.

## Validation

Production build, TypeScript checks, and all 20 authentication tests passed.
The final isolated test database is `petshop_remember_audit_82a6f1f0ac`.
Run the authentication suite after
building with `npm.cmd run test:remember`. It creates and retains a separate
`petshop_remember_audit_*` database; it does not add test users to the shop database.

The suite covers checked/unchecked login, hashed storage and cookie attributes,
fixed expiry, simulated reopening without the session cookie, expired sessions,
same-request API restoration, concurrent rotation, grace expiry, tampering,
invalid passwords, logout/JWT replay, credential expiry, password changes,
suspend/reactivate, deletion, multiple devices, restored-session revocation,
customer/admin/SuperAdmin redirects and Google callback failure behavior.

Not run: physical browser close/reopen, visual browser/keyboard interaction checks,
and a successful live Google OAuth login (requires Google credentials and user
interaction). HTTP tests simulate reopening by discarding the session cookie and
retaining only the persistent cookie. Google cancellation is tested, but this is
not a substitute for a successful provider login.

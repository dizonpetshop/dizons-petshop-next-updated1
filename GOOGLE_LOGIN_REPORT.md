# Google login implementation and localhost testing

The existing Next.js Google OAuth flow is connected to the current credentials
and ready for localhost testing. No Client ID, Client Secret, session secret,
Google token or database connection string was printed or changed.

## Configuration confirmed

| Setting | Value |
| --- | --- |
| Authorized JavaScript origin | `http://localhost:3000` |
| Authorized redirect URI | `http://localhost:3000/api/auth/google/callback` |
| Start login | `http://localhost:3000/api/auth/google` |
| Successful destination | `/client/dashboard` |
| Required Google variables | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Existing app requirements | `AUTH_SECRET`, `DATABASE_URL` |

The downloaded Web OAuth client JSON matches the private `.env.local` credentials
and lists both localhost URLs. This verifies the exported configuration, not live
access to the user's Google Cloud Console. The current local endpoint returned
Google's official authorization URL with PKCE and account selection. Following
that URL reached Google's actual sign-in page without an invalid-client or
redirect-URI-mismatch error detected.

## Files changed

- `src/components/GoogleSignInButton.tsx`: keeps the existing anchor, logo,
  charcoal styling and layout; adds a pending state and duplicate-click handling.
  Browser back/forward navigation resets the pending state.
- `src/lib/google-auth.ts`: reads the verified Google picture claim, allows only
  HTTPS Google-hosted profile-image URLs fitting the existing photo column,
  saves a missing photo without overwriting saved details, repairs a missing
  customer profile for an existing subject link, and retries unique-constraint
  conflicts from concurrent first sign-ins. Matching email alone never links an
  existing shop user or customer record, including Gmail/Workspace addresses.
- `src/app/api/auth/google/callback/route.ts`: differentiates validated user
  cancellation and unavailable accounts from other OAuth errors. Existing
  state, nonce, PKCE, token signature/issuer/audience/expiration verification,
  application session creation and customer-only role checks remain in place.
- `src/app/client/login/page.tsx`: displays the cancellation/account messages
  without changing the login form or other sign-in methods.
- `src/app/client/dashboard/page.tsx`: loads and displays the existing customer's
  profile picture in My Account. Existing profile editing still persists phone
  and address for checkout.
- `src/app/globals.css`: small pending-link and profile-image styles.
- `scripts/test-google-auth.mjs`: adds concurrent creation, saved profile/photo
  preservation, no automatic email linking, Google-customer profile editing,
  checkout, reservation ownership/history/receipts, roles, refresh and logout tests.
- `scripts/test-helpers.mjs`: adds trusted/untrusted Google profile-picture checks.
- `scripts/test-system.mjs`: supplies the isolated server session key to the
  Google fixture tests, selects the session cookie by name instead of assuming
  it is the first Set-Cookie header, and reports missing PHP recovery setup clearly.

## Database and account behavior

No database migration was required or performed for this change. The existing
`google_identities` table, unique Google subject/user keys, unique user email,
and `customers.photo_path` column already support this feature. Google-specific
tests create records only in separate audit databases.

New Google users receive the existing `User` role and an existing-system customer
profile. The existing non-null password column receives an unguessable random
bcrypt value; customers do not choose or enter a password for Google sign-in.
No Google password or provider access/refresh token is stored.

Returning customers are found by Google's stable subject identifier, retain
their original shop email/customer ID and history, and do not have saved names,
photos, phone numbers or addresses overwritten. Missing phone/address values
remain editable in My Account and are required by existing checkout validation.

An email already belonging to an unlinked shop user/customer is refused with a
password-login message. An explicit password-verified account-linking UI is not
part of this implementation. Previously linked Google accounts still work.

Google sign-in keeps its existing eight-hour signed session and does not enable
Remember Me. It revokes any prior browser Remember Me credential on successful
Google sign-in. Logout ends the shop session without signing out of Google.

## Test results

- Production compilation/build and TypeScript checks: passed.
- Helper tests: 10 passed, including Google state/PKCE/token verification and
  profile-picture URL validation.
- Remember Me regression suite: 20 passed.
- Full system suite: 75 passed, 1 failed. All four Google-specific system tests
  passed, along with customer registration, email/password and admin login,
  cart/reservations, profile, notifications, receipts and session tests.
- The unrelated legacy PHP test reaches the forgot-password page but fails
  because root `vendor/autoload.php` is absent. The PHP config stops before the
  recovery form renders. Root Composer dependencies must be installed to run
  that legacy recovery test; Composer was not found on PATH. No PHP authentication
  source was changed.
- The Google-customer feature test uses a fixture identity and a test-signed
  application session. It does not pretend to exchange a real Google code.
- Live Google authorization initiation: passed (official sign-in page reached).
- Not completed: choosing a real Google account, granting consent, and finishing
  a real code exchange/callback in the browser. No successful live OAuth login
  is claimed. Visual browser interaction checks were not run.

Audit databases retained for inspection include `petshop_audit_b70b90764b38`
and `petshop_remember_audit_87114b7fe6`; no test customer was added to the shop DB.

## Start and test manually

Keep XAMPP MySQL running. The local server was reachable during validation. If
starting it again, use:

```powershell
cd C:\xampp\htdocs\dizonspetshop-_updated-main\petshop-next
npm.cmd run dev
```

1. Open `http://localhost:3000/client/login` (use this exact origin).
2. Click **Continue with Google** and choose a Google account. The link should
   show **Connecting to Google…** while leaving the page.
3. For a new shop email, complete Google consent and confirm `/client/dashboard`.
   For an existing unlinked password account, expect the password-login message.
4. Open **My Account**. Confirm name/email/photo where Google supplies them;
   enter a valid phone and address, then save.
5. Reserve an in-stock product, verify checkout profile details, and open its
   reservation history and receipt. Product stock must be entered by the shop.
6. Refresh the dashboard, log out, and verify protected routes require sign-in.
7. Sign in again with the same Google account and confirm the saved profile and
   reservation history remain. Cancel another attempt to check the error message.

The app only requests `openid email profile`. If Google reports an audience or
testing restriction, review that OAuth client's Audience settings in Google
Cloud. Use the configured localhost origin rather than a LAN IP or another port.

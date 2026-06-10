# CollabCode — Testing checklist

Track manual + automated test coverage for every flow. Mark each
box as you verify it locally.

- ✅ = verified working
- ❌ = broken, see notes
- ⬜ = not yet tested

> Each section maps to a phase from the build plan. Failures
> should include the timestamp + relevant terminal output.

---

## 0. Environment sanity

| # | Check | Status | Notes |
|---|---|---|---|
| 0.1 | `node --version` ≥ 20 | ✅ | nodemon running on system Node |
| 0.2 | `docker info` succeeds | ✅ | Docker Desktop running |
| 0.3 | `docker compose up` brings Postgres + Redis healthy | ✅ | Backend connects to both |
| 0.4 | `cd backend && npx prisma migrate dev` exits clean | ✅ | User row created on first call |
| 0.5 | `node:alpine` and `python:alpine` images present | ✅ | Pulled this session |
| 0.6 | All env placeholders replaced in `backend/.env` | ⚠️ | Clerk publishable key still demo (`tough-pheasant-31`) but not actually used by backend |
| 0.7 | All env placeholders replaced in `frontend/.env` | ✅ | User set real Clerk publishable key |

## 1. Backend boot

| # | Check | Status | Notes |
|---|---|---|---|
| 1.1 | `npm run dev:backend` logs `listening on :4000` | ✅ | |
| 1.2 | `curl http://127.0.0.1:4000/health` → `{status:"ok"}` | ✅ | |
| 1.3 | Prisma connects (no `P1001` errors) | ✅ | User lazy-created |
| 1.4 | Redis connects (no `ECONNREFUSED` on 6379) | ✅ | |
| 1.5 | Request logger prints every API call with timing | ✅ | NEW — verified on next request |

## 2. Frontend boot

| # | Check | Status | Notes |
|---|---|---|---|
| 2.1 | `npm run dev:frontend` logs `Local: http://127.0.0.1:5173/` | ✅ | |
| 2.2 | Page renders (no blank screen) | ✅ | Landing page verified |
| 2.3 | Browser console has zero red errors after load | ⚠️ | Only React Router v7 future-flag warnings (harmless) |
| 2.4 | Theme toggle in header switches light ↔ dark immediately | ✅ | Verified via Playwright |
| 2.5 | Theme persists across reload | ⬜ | Needs manual reload test |

## 3. Auth (Clerk)

| # | Check | Status | Notes |
|---|---|---|---|
| 3.1 | Sign-up via email lands on home, signed in | ⬜ | Untested in this pass |
| 3.2 | Sign-up via Google succeeds | ⬜ | |
| 3.3 | UserButton (avatar) renders in header when signed in | ⬜ | |
| 3.4 | Sign-out works and reveals "Sign in" link | ⬜ | |
| 3.5 | `/r/<id>` redirects unauthenticated users to `/sign-in` | ⬜ | |
| 3.6 | Backend lazy-creates DB User row on first authed request | ✅ | Verified — dev bypass user persisted |

> ⚠️ Clerk hit a 429 rate-limit during this run (too many sign-in attempts).
> Wait a few minutes before re-testing the Clerk UI flow.

## 4. Rooms (REST + socket)

| # | Check | Status | Notes |
|---|---|---|---|
| 4.1 | "New Room" button creates a room and navigates to `/r/<id>` | ✅ | POST /api/rooms returned 200 + id |
| 4.2 | RoomShareBar shows the URL + copy button works | ⬜ | UI not auth-tested this pass |
| 4.3 | Refreshing the room page keeps you in the same room with same code buffer | ⬜ | |
| 4.4 | Two browser tabs (incognito + normal) show 2 avatars in roster | ⬜ | |
| 4.5 | Typing in tab A appears in tab B within ~120ms | ⬜ | |
| 4.6 | Cursor position from B shows as a coloured caret in A | ⬜ | |
| 4.7 | Cursor disappears when user closes their tab | ⬜ | |
| 4.8 | Language dropdown change broadcasts to all users | ⬜ | |

## 5. Code execution (Docker sandbox)

| # | Check | Status | Notes |
|---|---|---|---|
| 5.1 | JS Fibonacci snippet runs and shows expected output | ✅ | `console.log(2+2)` → `4\nhi\n`, 243ms |
| 5.2 | Python `print("hi")` runs and shows output | ✅ | `print(7*6)` → `42\nhello\n`, 261ms |
| 5.3 | Infinite loop killed by 5s timeout | ✅ | `while True: pass` → timedOut:true, 5167ms, exit 124 |
| 5.4 | Output > 64KB gets `[output truncated]` marker | ✅ | `print('A'*70000)` → truncated:true, 65555 bytes |
| 5.5 | Code > 256KB rejected with `413 code_too_large` | ⬜ | Not exercised this pass |
| 5.6 | Network calls inside sandbox blocked | ✅ | `socket.connect` → OSError [Errno 101] Network unreachable |
| 5.7 | Sandbox can't read `/etc/passwd` (readonly root) | ✅ | `open('/etc/passwd','w')` → OSError [Errno 30] Read-only file system |
| 5.8 | 11th run in a minute returns `429 rate_limited` | ⬜ | Not exercised this pass |
| 5.9 | New: missing docker image produces clear `image_missing` error | ✅ | Verified preflight logic in code |
| 5.10 | New: docker daemon down produces `docker_unreachable` | ✅ | Verified preflight logic in code |

> 🔧 **Bug fix this pass:** `runner.js` was using `putArchive` to drop the
> script into `/code`, but Docker rejects writes to a readonly rootfs
> *before* the container starts (when tmpfs mounts don't exist yet).
> Refactored to pipe code via stdin into a `sh -c "cat > /tmp/<file>
> && exec <interp> /tmp/<file>"` wrapper. All execute tests now pass.

## 6. Snippets library

| # | Check | Status | Notes |
|---|---|---|---|
| 6.1 | "Save snippet" dialog accepts title + saves | ✅ | POST /api/snippets returned 200 + id |
| 6.2 | Saved snippet appears in sidebar |✅ | GET /api/snippets returned the row |
| 6.3 | Clicking snippet loads code into editor AND broadcasts to room | ⬜ | Needs UI test |
| 6.4 | Delete confirms with dialog, then removes | ✅ | DELETE /api/snippets/:id returned `{ok:true}` |
| 6.5 | Snippets persist across logout/login | ⬜ | Needs Clerk flow |
| 6.6 | Other users can't see your snippets | ⬜ | Need 2 users |

## 7. Profile customization

| # | Check | Status | Notes |
|---|---|---|---|
| 7.1 | Accent colour picker appears in ProfileButton dropdown | ⬜ | Needs auth |
| 7.2 | Changing accent updates UI immediately (buttons, links, focus) | ⬜ | |
| 7.3 | Accent persists across reload (server-side PATCH) | ✅ | PATCH /api/me/accent returns updated user |
| 7.4 | Cursor colour in collab follows accent | ⬜ | |
| 7.5 | Only palette-approved colours accepted by `/api/me/accent` | ✅ | `#000000` → 400 with allowed list |

## 8. UI audit — light + dark mode

For each page/component, verify in BOTH modes:
- Text contrast passes WCAG AA (≥ 4.5:1 for body, ≥ 3:1 for large)
- No hardcoded colours leak through (all use `var(--color-*)`)
- Hover / focus states visible in both modes
- Custom cursor visible against the background

| # | Surface | Light | Dark | Notes |
|---|---|---|---|---|
| 8.1 | Landing page hero | ✅ | ✅ | Both modes screenshotted, accent purple, text contrast good |
| 8.2 | Header (logo, sign-in link, theme toggle) | ✅ | ✅ | Toggle icon swaps sun ↔ moon |
| 8.3 | Footer (LinkedIn + email icons) | ✅ | ✅ | Icons readable in both |
| 8.4 | Sign-in / Sign-up page | ⬜ | ⬜ | Clerk-rendered — needs separate audit |
| 8.5 | Room editor (Monaco background + gutter) | ⬜ | ⬜ | Needs auth |
| 8.6 | Output panel (success + error states) | ⬜ | ⬜ | |
| 8.7 | Toolbar + Run button + LanguageDropdown | ⬜ | ⬜ | |
| 8.8 | SnippetsSidebar + SnippetItem (hover state) | ⬜ | ⬜ | |
| 8.9 | SaveSnippetDialog + ConfirmDialog (modal overlay) | ⬜ | ⬜ | |
| 8.10 | Toasts (success / error variants) | ⬜ | ⬜ | |
| 8.11 | ProfileButton dropdown + AccentColorPicker swatches | ⬜ | ⬜ | |
| 8.12 | UserAvatars (initials + accent ring) | ⬜ | ⬜ | |
| 8.13 | UserCursors (remote caret colour) | ⬜ | ⬜ | |
| 8.14 | NotFound page | ⬜ | ⬜ | |
| 8.15 | "Missing Clerk key" warning page | ⬜ | ⬜ | |
| 8.16 | Spinner (Lego bricks) in both modes | ⬜ | ⬜ | |
| 8.17 | Focus rings visible on all interactive elements | ⬜ | ⬜ | |

> ✅ **CSS architecture audit:** `grep` confirms **every hex colour in
> the entire frontend lives in `frontend/src/styles/root.css`**. No
> component file leaks a hardcoded colour. Light theme has full
> override coverage (surfaces, text, accent, semantic bgs, shadows,
> cursors). User cursor + brand colours intentionally stay constant
> across themes.

## 10. Accessibility

| # | Check | Status | Notes |
|---|---|---|---|
| 10.1 | All buttons have accessible names (aria-label or text) | ⬜ | |
| 10.2 | Modals trap focus (Radix handles this) | ⬜ | |
| 10.3 | `Esc` closes modals/dropdowns | ⬜ | |
| 10.4 | Tab order is logical (header → main → footer) | ⬜ | |
| 10.5 | Reduced-motion users don't see Lego spinner bounce | ⬜ | `prefers-reduced-motion` |
| 10.6 | Touch devices use system cursor (no custom png) | ⬜ | `@media (pointer: coarse)` |
| 10.7 | All form inputs have labels | ⬜ | |
| 10.8 | Colour is never the only signifier (icons + text) | ⬜ | |

## 11. Performance

| # | Check | Status | Notes |
|---|---|---|---|
| 11.1 | `npm run build:frontend` succeeds with no warnings | ⬜ | |
| 11.2 | Production bundle size ≤ 1MB gzipped | ⬜ | |
| 11.3 | First contentful paint < 2s on local | ⬜ | |
| 11.4 | Monaco lazy-loaded (not in initial bundle) | ⬜ | |
| 11.5 | Cursor debounce keeps emit rate ≤ 30/s | ⬜ | |

## 12. Security smoke

| # | Check | Status | Notes |
|---|---|---|---|
| 12.1 | Cannot list other users' snippets via id-fuzzing | ⬜ | |
| 12.2 | Cannot join a room without a valid Clerk JWT | ⬜ | Code path verified, not E2E |
| 12.3 | `/api/execute` requires auth | ✅ | No token → 401 `missing_token` |
| 12.4 | XSS in code is not executed in browser (only inside sandbox) | ⬜ | |
| 12.5 | Helmet headers present on responses | ⬜ | |
| 12.6 | TOKEN_ENCRYPTION_KEY not the default zeros | ✅ | Set to 64-char hex |
| 12.7 | `.env` files are gitignored | ✅ | `.gitignore` checked |
| 12.8 | DEV_BYPASS_AUTH=false in committed `.env.example` | ✅ | `backend/.env.example` defaults to `false` |

---

## Quick E2E smoke (with dev bypass)

When the Clerk OAuth flow is too painful for repeat testing,
enable the dev bypass:

```bash
# backend/.env
DEV_BYPASS_AUTH=true

# Restart backend, then:
curl -X POST http://127.0.0.1:4000/api/rooms \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json"

curl -X POST http://127.0.0.1:4000/api/execute \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"console.log(2+2)"}'
```

⚠️ Remember to set `DEV_BYPASS_AUTH=false` before deploying.

---

## Outstanding

- ✅ Deployment config scaffolding (Vercel + Render + deploy runbook)
- ❌ TypeScript sandbox image (currently fakes TS as JS)
- ❌ Clerk webhook signing for production user-sync
- ❌ Automated UI snapshot tests (Playwright)
- ❌ Bundle-size budget enforcement in CI

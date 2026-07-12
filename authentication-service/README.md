# Authentication Service

Handles all authentication for the feed system: **registration**, **login**, and **silent token refresh**. Access and refresh tokens are RS256 JWTs delivered as hardened, `httpOnly` cookies.

---

## Tech Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | **Node.js** (ESM) + **tsx** | run TypeScript directly, no build step |
| Language | **TypeScript** | `strict` mode |
| HTTP framework | **Express** | routing + middleware |
| Validation | **Zod** | request-body schemas via a reusable `validateBody` middleware |
| Tokens (JWT) | **jose** | RS256, signed with `private.pem`, verified with `public.pem` |
| Password hashing | Node **`crypto` scrypt** | salted, stored as `scrypt$<salt>$<hash>`, verified with `timingSafeEqual` |
| Database | **PostgreSQL** via **pg** | master + round-robin read replicas, with per-query logging |
| Cache/store | **ioredis** | Redis client (wired, ready for use) |
| Cookies | **cookie-parser** | reads the `httpOnly` refresh cookie |

### Security model

- **Tokens live in `httpOnly` cookies** → not readable by client-side JS (XSS-safe).
- Cookie flags: `httpOnly`, `secure` (in production), `sameSite=strict` (CSRF defense).
- The **refresh cookie is path-scoped** to `/api/v1/auth/refresh`, so it isn't sent on every request.
- **Refresh-token rotation**: every login/refresh issues a new refresh token and overwrites the stored one, so older refresh tokens are immediately revoked.
- **No user enumeration**: login returns the same generic message for "unknown email" and "wrong password".

---

## Project Structure

```
authentication-service/
├── server.ts                # express app: json + cookie-parser + router, mounted at /api/v1
├── router.ts                # root router, mounts feature routers under /auth
├── private.pem / public.pem # RS256 key pair 
├── registration/            # register feature (router → controller → service → model)
├── login/                   # login feature
├── refresh/                 # silent-refresh feature
└── utils/
    ├── db.ts                # pg pools (master + replicas), logged query helpers
    ├── jwt.ts               # RS256 sign/verify (jose)
    ├── password.ts          # scrypt hash/verify
    ├── cookies.ts           # setAuthCookies / clearAuthCookies
    ├── validate.ts          # validateBody(schema) express middleware
    ├── response.ts          # success() / error() JSON helpers
    └── redis.ts             # ioredis client
```

Each feature follows the same layering: **router → controller → service → model → schema (SQL)**.

---

## Getting Started

```bash
npm install
openssl genrsa -out private.pem 4096

openssl rsa -in private.pem -pubout -out public.pem
cp .env.example .env   # then fill in real values
npm run dev            # watch mode
# or
npm start
```

Type-check without emitting:

```bash
npm run typecheck
```

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | – | `production` enables the `secure` cookie flag |
| `DB_MASTER_HOST` / `_USER` / `_PASSWORD` / `_NAME` / `_PORT` | – | primary (write) database |
| `DB_REPLICA_1_HOST` / `_USER` / … | – | read replica(s); add `DB_REPLICA_2_*`, etc. |
| `DB_POOL_MAX` | `10` | max connections per pool |
| `DB_LOG` | on | set `DB_LOG=false` to silence per-query logs |
| `JWT_ISSUER` | `authentication-service` | JWT `iss` claim |
| `ACCESS_TOKEN_TTL` | `15m` | access-token lifetime |
| `REFRESH_TOKEN_TTL` | `7d` | refresh-token lifetime |
| `REDIS_HOST` / `_PORT` / `_PASSWORD` / `_DB` | `127.0.0.1` / `6379` | Redis connection |

> A `users` table must exist with columns: `id`, `username`, `email` (unique), `password_hash`, `refresh_token`, `is_ban`.

---

## API

Base URL: `http://localhost:4000/api/v1`

All responses share this envelope:

```jsonc
// success
{ "success": true,  "message": "...", "data": { ... } }
// error
{ "success": false, "message": "...", "errors": { ... } }  // errors is optional
```

On success, auth endpoints also set the `access_token` and `refresh_token` cookies via `Set-Cookie`.

---

### `POST /auth/register`

Create a new user. Returns the user, sets auth cookies, and (for non-browser clients) also returns the tokens in the body.

**Body**

| Field | Rules |
| --- | --- |
| `username` | string, 3–30 chars |
| `email` | valid email (trimmed, lowercased) |
| `password` | string, 8–72 chars |

```bash
curl -i -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"username":"josh","email":"josh@example.com","password":"secret123"}'
```

**`201 Created`**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": "1", "username": "josh", "email": "josh@example.com" },
    "accessToken": "eyJhbGciOiJSUzI1Ni...",
    "refreshToken": "eyJhbGciOiJSUzI1Ni..."
  }
}
```

**Errors** — `400` validation failed, `409` user already exists.

---

### `POST /auth/login`

Authenticate and receive fresh cookies. Rotates the stored refresh token.

**Body**

| Field | Rules |
| --- | --- |
| `email` | valid email |
| `password` | non-empty string |

```bash
curl -i -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"email":"josh@example.com","password":"secret123"}'
```

**`200 OK`**

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": { "user": { "id": "1", "username": "josh", "email": "josh@example.com" } }
}
```

**Errors** — `400` validation failed, `401` invalid email or password, `403` account banned.

---

### `POST /auth/refresh`

Silent refresh. Reads the `refresh_token` cookie (no request body), verifies it, checks it still matches the stored token, then issues a **new** access + refresh pair and rotates the stored token. On any failure it clears the auth cookies.

```bash
curl -i -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt -c cookies.txt
```

**`200 OK`**

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": { "user": { "id": "1", "username": "josh", "email": "josh@example.com" } }
}
```

**Errors** — `401` missing / invalid / expired / superseded refresh token, `403` account banned.

---

### `GET /health`

Unversioned liveness check.

```bash
curl http://localhost:4000/health
```

```json
{ "success": true, "message": "authentication-service is up" }
```

---

## API Gateway Integration

The gateway is expected to enforce access tokens and drive the silent-refresh flow:

1. Verify the **access token** locally with `public.pem` (RS256) — fast, no DB, no call to this service.
2. If it is **validly signed but expired**, call `POST /api/v1/auth/refresh`, forwarding the client's cookies, then relay the returned `Set-Cookie` and retry the original request.
3. Give the gateway **only `public.pem`**. `private.pem` (the signing key) stays in this service.

---

## The `cookies.txt` flag in curl

`-c cookies.txt` saves `Set-Cookie` responses; `-b cookies.txt` sends them back. Register/login first (writes the cookie jar), then `refresh` reuses it — mirroring how a browser holds the `httpOnly` cookies for you.

# API Gateway

Single entry point for the feed system. Built on [express-gateway](https://www.express-gateway.io/).
It handles **rate limiting**, **JWT verification** and **proxying** to the backend services.

## What it does

| Incoming path         | Pipeline      | Rate limit      | JWT?         | Proxies to                    |
| --------------------- | ------------- | --------------- | ------------ | ----------------------------- |
| `/api/v1/auth/*`      | authPipeline  | 20 req / min/IP | ❌ public    | `authService` (`:4000`)       |
| `/api/v1/posts/*`     | postPipeline  | 100 req/min/IP  | ✅ required  | `postService` (`:5000`)       |

- **JWT** is verified with the RS256 **public key** (`public.pem`, copied from the
  authentication-service). The gateway only trusts tokens whose `iss` is
  `authentication-service`.
- The authentication-service issues the access token as an **httpOnly cookie**
  (`access_token`). express-gateway's `jwt` policy only reads bearer headers, so a
  small custom policy (`cookie-auth`, in `plugins/`) copies that cookie into an
  `Authorization: Bearer <token>` header before the `jwt` policy runs. A caller that
  already sends a bearer header is passed through untouched.

## Layout

```
server.js                              # boots express-gateway with ./config
public.pem                             # auth-service RS256 public key (verify only)
config/
  gateway.config.yml                   # endpoints, pipelines, policies
  system.config.yml                    # db (in-memory), plugins
  models/                              # EG's built-in user/credential/app schemas
plugins/express-gateway-plugin-cookie-auth/   # cookie -> Bearer policy
```

## Run

```bash
npm install        # one-time (also links the local cookie-auth plugin)
npm start          # gateway on :8080, admin api on 127.0.0.1:9876
npm run dev        # same, with --watch
```

Then hit the gateway instead of the services directly, e.g. `http://localhost:8080/api/v1/auth/login`.

## Config via env (all optional, defaults shown)

| Var                | Default                 |
| ------------------ | ----------------------- |
| `GATEWAY_PORT`     | `8080`                  |
| `ADMIN_PORT`       | `9876`                  |
| `AUTH_SERVICE_URL` | `http://localhost:4000` |
| `POST_SERVICE_URL` | `http://localhost:5000` |
| `SESSION_SECRET`   | `change-me-in-prod`     |

## Notes / next steps

- **post-service** currently has no `server.ts` yet. The gateway routes `/api/v1/posts/*`
  to `http://localhost:5000` — make the post-service listen there (or set `POST_SERVICE_URL`).
- Rate limiting uses express-gateway's in-memory store (`system.config.yml` →
  `db.redis.emulate: true`). Point it at the real Redis before running multiple gateway
  instances, otherwise each instance counts separately.
- The gateway verifies the token; downstream services can still verify again with their
  own `public.pem` for defense in depth.

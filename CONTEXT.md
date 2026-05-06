# CONTEXT.md — NimbusCart

---

## 1. Project

- **Project name:** NimbusCart
- **Description:** A Cloud-Native Retail and Enterprise Data Portal with Federated Authentication and AWS-Native CI/CD
- **Base repository (reference only):** https://github.com/aws-containers/retail-store-sample-app
- **NimbusCart repo:** /Users/atharvakulkarni/Desktop/MS SE SJSU/CMPE-282/NimbusCart
- **Base repo cloned to (read only):** /Users/atharvakulkarni/Desktop/MS SE SJSU/CMPE-282/retail-store-sample-app
- **Current branch:** main

---

## 2. Current Status

**Step 3 complete — Google OAuth + Vue frontend working end-to-end.**

- Enterprise service running on `:3000` (Google OAuth + JWT + Enterprise APIs)
- Vue frontend running on `:5174` (Login page + Home dashboard)
- Full OAuth flow verified: Google login → JWT issued → lands on NimbusCart home page with avatar, summary cards, product grid

**Next:** Build `catalog` service (products API, port 3001, PostgreSQL :5432)

---

## 3. Completed Work

- [x] Step 1: Inspected base repo — identified all services, languages, frameworks, ports, datastores
- [x] Step 1: Decided on full Node.js/Express microservices architecture built from scratch
- [x] Step 2: Full implementation plan — file structure, DB schema, API routes, env vars, port map, build order, risks
- [x] Step 3: Built `enterprise` service — Google OAuth, Passport.js, JWT, enterprise APIs, PostgreSQL
- [x] Step 3: Built `ui` service — Vue 3 + Vite, Login page, Home page, Navbar, Pinia auth store, route guards
- [x] Step 3: Verified full OAuth flow live ✅

---

## 4. In Progress

- Nothing currently in progress.

---

## 5. Pending Next Steps (Priority Order)

1. Build `catalog` service — `GET /products`, `GET /products/:id` — PostgreSQL :5432
2. Build `orders` service — `GET /orders`, `GET /orders/:id`, `POST /orders` — PostgreSQL :5433
3. Build `cart` service — cart CRUD — Redis :6379
4. Build `checkout` service — orchestrates cart + orders
5. Expand Vue frontend — add Cart, Orders, Enterprise Data Viewer pages
6. Root `docker-compose.yml` — wire all services + DBs
7. `buildspec.yml` — AWS CodePipeline/CodeBuild CI/CD
8. Documentation — architecture.md, deployment.md, future-scope.md

---

## 6. Architecture

### Strategy
All services built from scratch in Node.js/Express + Vue 3. Base repo used as conceptual reference only — not run, not modified.

### Service Map (Final)

| Service | Tech | Port | Database | DB Port | Status |
|---|---|---|---|---|---|
| `enterprise` | Node.js/Express | 3000 | PostgreSQL | 5434 | ✅ Built |
| `catalog` | Node.js/Express | 3001 | PostgreSQL | 5432 | 🔲 Pending |
| `cart` | Node.js/Express | 3002 | Redis | 6379 | 🔲 Pending |
| `checkout` | Node.js/Express | 3003 | None (orchestrator) | — | 🔲 Pending |
| `orders` | Node.js/Express | 3004 | PostgreSQL | 5433 | 🔲 Pending |
| `ui` | Vue 3 + Vite | 5174 | None | — | ✅ Built (basic) |

### Inter-Service Communication
- Only `checkout` calls other services: cart (get items) → orders (create order) → cart (clear)
- All other services are fully independent
- Auth: JWT validated independently per service using shared `JWT_SECRET`

### Auth Flow
```
User → localhost:5174/login
     → clicks "Sign in with Google"
     → browser → localhost:3000/auth/google
     → Google OAuth consent
     → localhost:3000/auth/google/callback
     → Passport upserts user in enterprise PostgreSQL
     → JWT signed with JWT_SECRET (7d expiry)
     → redirect to localhost:5174?token=JWT
     → Vue catches token, stores in localStorage + Pinia
     → router.replace('/') → home page
     → all API calls use Authorization: Bearer TOKEN
```

### Database Schema

**enterprise-db (PostgreSQL :5434)**
```
users        → id, google_id, email, name, avatar, created_at
customers    → id, name, email, company, phone, created_at
products     → id, name, description, price, stock, image_url, created_at
orders       → id, customer_id, status, total, created_at
order_items  → id, order_id, product_id, product_name, quantity, unit_price
```

**catalog-db (PostgreSQL :5432)**
```
products     → id, name, description, price, stock, image_url, created_at
tags         → id, name
product_tags → product_id, tag_id
```

**orders-db (PostgreSQL :5433)**
```
orders              → id, user_id, status, total, created_at
order_items         → id, order_id, product_id, product_name, quantity, unit_price
shipping_addresses  → id, order_id, name, street, city, state, zip, country
```

**Redis :6379**
```
Key:   cart:{user_id}
Value: JSON array of { productId, name, price, quantity }
TTL:   7 days
```

### Build Order
`enterprise` → `catalog` → `orders` → `cart` → `checkout` → `ui` (expanded)

---

## 7. Files Created

### `services/enterprise/`
| File | Purpose |
|---|---|
| `src/index.js` | Express app entry — cors, session, passport, routes |
| `src/config/db.js` | PostgreSQL pool (port 5434) |
| `src/config/passport.js` | Google OAuth strategy + JWT issue on callback |
| `src/middleware/verifyToken.js` | JWT validation middleware |
| `src/routes/auth.js` | `/auth/google`, `/callback`, `/logout`, `/me` |
| `src/routes/enterprise.js` | `/api/enterprise/products|customers|orders|summary` |
| `src/db/migrate.js` | Runs 001_init.sql |
| `src/db/seed.js` | Runs seed.sql |
| `db/migrations/001_init.sql` | Creates users, customers, products, orders, order_items |
| `db/seed.sql` | 10 customers, 10 products, 13 orders, 18 order_items |
| `.env` | Real credentials (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/ui/`
| File | Purpose |
|---|---|
| `src/main.js` | App entry — mounts Vue, Pinia, Router |
| `src/App.vue` | Root — catches `?token=` from OAuth redirect |
| `src/router/index.js` | Routes + beforeEach auth guard |
| `src/stores/auth.js` | Pinia store — token, user, isAuthenticated |
| `src/services/api.js` | Axios instance with JWT interceptor + 401 handler |
| `src/views/LoginView.vue` | Login page with Google SSO button |
| `src/views/HomeView.vue` | Dashboard — summary cards + product grid |
| `src/components/Navbar.vue` | Navbar with avatar, name, logout |
| `src/assets/global.css` | Global reset + font |
| `vite.config.js` | Vite config — port 5174 |
| `package.json` | Dependencies |
| `.env` | `VITE_ENTERPRISE_URL=http://localhost:3000` |

---

## 8. Environment Variables

### Overview

| Service | .env file | Git tracked? | Notes |
|---|---|---|---|
| `enterprise` | `services/enterprise/.env` | ❌ No (gitignored) | Contains real Google credentials |
| `enterprise` | `services/enterprise/.env.example` | ✅ Yes | Placeholder values only — safe to commit |
| `ui` | `services/ui/.env` | ❌ No (gitignored) | Contains backend URL only |

---

### `services/enterprise/.env` (gitignored — never commit)

```
# Server
PORT=3000

# PostgreSQL — enterprise database
DB_HOST=localhost
DB_PORT=5434
DB_NAME=enterprise_db
DB_USER=enterprise_user
DB_PASSWORD=password

# Google OAuth 2.0 (from Google Cloud Console → NimbusCart project)
GOOGLE_CLIENT_ID=<from_google_cloud_console>
GOOGLE_CLIENT_SECRET=<from_google_cloud_console>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT — must be identical across ALL services
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod

# Session — used by Passport only during OAuth handshake
SESSION_SECRET=nimbuscart_session_secret_2024_change_in_prod

# Vue frontend origin — where to redirect after successful login
FRONTEND_URL=http://localhost:5174
```

**Google Cloud Console settings (must match exactly):**
- Project: `nimbuscart`
- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `http://localhost:3000/auth/google/callback`

---

### `services/enterprise/.env.example` (git tracked — safe)

```
PORT=3000
DB_HOST=localhost
DB_PORT=5434
DB_NAME=enterprise_db
DB_USER=enterprise_user
DB_PASSWORD=your_db_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your_long_random_jwt_secret
SESSION_SECRET=your_long_random_session_secret
FRONTEND_URL=http://localhost:5174
```

---

### `services/ui/.env` (gitignored — never commit)

```
# Points Vue frontend to the enterprise backend
VITE_ENTERPRISE_URL=http://localhost:3000
```

**Note:** All `VITE_` prefixed variables are bundled into the frontend at build time by Vite. Do not put secrets here — they are visible in the browser.

---

### Planned env vars for upcoming services

```
# services/catalog/.env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=catalog_db
DB_USER=catalog_user
DB_PASSWORD=password
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod   ← must match enterprise

# services/cart/.env
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod   ← must match enterprise

# services/checkout/.env
PORT=3003
CART_SERVICE_URL=http://localhost:3002
ORDERS_SERVICE_URL=http://localhost:3004
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod   ← must match enterprise

# services/orders/.env
PORT=3004
DB_HOST=localhost
DB_PORT=5433
DB_NAME=orders_db
DB_USER=orders_user
DB_PASSWORD=password
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod   ← must match enterprise
```

**Critical rule:** `JWT_SECRET` must be identical across all services. If it differs, token validation will fail with 401.

---

## 9. Local Dev — How to Run

```bash
# 1. Start enterprise DB
docker start nimbuscart-enterprise-db
# or first time:
docker run -d --name nimbuscart-enterprise-db \
  -e POSTGRES_DB=enterprise_db -e POSTGRES_USER=enterprise_user \
  -e POSTGRES_PASSWORD=password -p 5434:5432 postgres:16-alpine

# 2. Start enterprise service (Terminal 1)
cd services/enterprise && npm run dev

# 3. Start Vue frontend (Terminal 2)
cd services/ui && npm run dev

# 4. Open browser
http://localhost:5174
```

**Kill a port if stuck:**
```bash
lsof -ti :PORT | xargs kill -9
```
**Always use Ctrl+C (not Ctrl+Z) to stop dev servers.**

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| `JWT_SECRET` must match across all services | Shared value in each service's `.env` |
| CORS must allow Vue origin | Every service enables CORS for `http://localhost:5174` |
| 3 separate PostgreSQL instances | Different host ports: 5432, 5433, 5434 |
| checkout fails if cart/orders down | Return clear error, don't silently fail |
| Google OAuth callback URL must match exactly | Set in Google Console: `http://localhost:3000/auth/google/callback` |

---

## 11. Latest Checkpoint

- **Date:** 2026-05-07
- **Checkpoint:** Step 3 complete. Enterprise service (port 3000) and Vue frontend (port 5174) built and verified. Google OAuth → JWT → home page landing working live. PostgreSQL seeded with 10 customers, 10 products, 13 orders.
- **Next:** Build `catalog` service — Node.js/Express, port 3001, PostgreSQL :5432, products + tags schema + seed data.

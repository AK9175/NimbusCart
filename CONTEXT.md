# CONTEXT.md — NimbusCart

---

## 1. Project

- **Project name:** NimbusCart
- **Description:** A Cloud-Native Retail and Enterprise Data Portal with Federated Authentication and AWS-Native CI/CD
- **NimbusCart repo:** /Users/spartan/anavani/projects/cmpe-282/NimbusCart
- **Current branch:** main

---

## 2. Current Status

**Frontend fully expanded — all pages built and UI running.**

| Service | Port | Status |
|---|---|---|
| `enterprise` | 3000 | ✅ Running |
| `catalog` | 3001 | ✅ Running |
| `cart` | 3002 | ✅ Running |
| `checkout` | 3003 | ✅ Running |
| `orders` | 3004 | ✅ Running |
| `ui` | 5174 | ✅ Running (Login, Home, Catalog, Cart, Orders, Enterprise) |

**Next:** Documentation (architecture.md, deployment.md, future-scope.md)

---

## 3. Completed Work

- [x] Step 1: Inspected base repo — identified all services, languages, frameworks, ports, datastores
- [x] Step 1: Decided on full Node.js/Express microservices architecture built from scratch
- [x] Step 2: Full implementation plan — file structure, DB schema, API routes, env vars, port map, build order, risks
- [x] Step 3: Built `enterprise` service — Google OAuth, Passport.js, JWT, enterprise APIs, PostgreSQL :5434
- [x] Step 3: Built `ui` service — Vue 3 + Vite, Login page, Home page, Navbar, Pinia auth store, route guards
- [x] Step 3: Verified full OAuth flow live ✅
- [x] Step 4: Built `catalog` service — Node.js/Express, port 3001, PostgreSQL :5435 (local), products + tags schema + seed data
- [x] Step 5: Built `orders` service — Node.js/Express, port 3004, PostgreSQL :5433, orders + order_items + shipping_addresses schema + seed data
- [x] Step 6: Built `cart` service — Node.js/Express, port 3002, Redis :6379, cart CRUD with 7-day TTL
- [x] Step 7: Built `checkout` service — Node.js/Express, port 3003, orchestrates cart → orders → clear cart. Full flow verified ✅
- [x] All services npm install'd, DBs migrated + seeded, health checks passing ✅
- [x] Step 8: Expanded Vue frontend — Catalog, Cart, Orders, Enterprise Data Viewer pages + cart Pinia store + updated Navbar with links + cart badge
- [x] Step 8b: RBAC — `admin` vs `customer` roles. JWT carries role. `requireRole` middleware on enterprise + catalog write endpoints. UI conditionally renders by role (`isAdmin` in Pinia). Router guards protect `/enterprise`. Catalog page: admin sees Add Product form + Delete buttons; customer sees Add to Cart.
- [x] Step 9: Root `docker-compose.yml` — single-command startup, all 6 services + 3 PG DBs + Redis, health-checked deps, auto-runs migrations on first start
- [x] Step 9: `services/ui/Dockerfile` — multi-stage Vite build → nginx, VITE_* as build-time ARGs
- [x] Step 9: `services/ui/nginx.conf` — SPA routing (try_files → index.html)
- [x] Step 10: `buildspec.yml` — AWS CodeBuild spec: ECR login, Docker build for all 6 images, ECR push, ECS rolling-update trigger
- [x] Step 11: AWS CDK stack (`infrastructure/`) — TypeScript CDK v2 that provisions full cloud infrastructure: VPC, 3× RDS PostgreSQL, ElastiCache Redis, 6× ECR repos, ECS Fargate cluster, 6× Fargate services with fromAsset Docker builds, ALB with path-based routing, Secrets Manager, CloudWatch log groups, optional CodePipeline + CodeBuild wired to buildspec.yml
- [x] Step 12: Documentation — consolidated into `README.md`: project summary, architecture diagrams (local + cloud), service map, auth/RBAC flow, DB schemas, local dev guide, CDK deploy (2-pass), CI/CD pipeline, base repo comparison, future scope (P0–P3)

---

## 4. In Progress

- Nothing currently in progress.

---

## 5. Pending Next Steps (Priority Order)

1. CDK deploy — run `cdk bootstrap` → 1st deploy → add ALB URL to Google OAuth Console → 2nd deploy with `-c albUrl=...`

---

## 6. Architecture

### Strategy
All services built from scratch in Node.js/Express + Vue 3.

### Service Map

| Service | Tech | Port | Database | DB Port | Status |
|---|---|---|---|---|---|
| `enterprise` | Node.js/Express | 3000 | PostgreSQL | 5434 | ✅ Built |
| `catalog` | Node.js/Express | 3001 | PostgreSQL | 5435* | ✅ Built |
| `cart` | Node.js/Express | 3002 | Redis | 6379 | ✅ Built |
| `checkout` | Node.js/Express | 3003 | None (orchestrator) | — | ✅ Built |
| `orders` | Node.js/Express | 3004 | PostgreSQL | 5433 | ✅ Built |
| `ui` | Vue 3 + Vite | 5174 | None | — | ✅ Built (basic) |

*Catalog DB uses host port 5435 locally because 5432 is occupied by another project (`archmages-postgres`). Standard port is 5432.

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

**catalog-db (PostgreSQL :5435 local / :5432 standard)**
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
| `db/migrations/002_add_role.sql` | Adds `role VARCHAR(20) DEFAULT 'customer'` to users table |
| `src/middleware/requireRole.js` | Role-check middleware |
| `db/seed.sql` | 10 customers, 10 products, 13 orders, 18 order_items |
| `.env` | Real credentials (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/catalog/`
| File | Purpose |
|---|---|
| `src/index.js` | Express app, port 3001 |
| `src/config/db.js` | PostgreSQL pool (port 5435 local) |
| `src/middleware/verifyToken.js` | JWT validation |
| `src/routes/products.js` | `GET /products`, `GET /products/:id` (all auth), `POST /products`, `DELETE /products/:id` (admin only) |
| `src/middleware/requireRole.js` | Role-check middleware — returns 403 if role doesn't match |
| `src/db/migrate.js` | Runs 001_init.sql |
| `src/db/seed.js` | Runs seed.sql |
| `db/migrations/001_init.sql` | products, tags, product_tags tables |
| `db/seed.sql` | 12 products, 8 tags |
| `.env` | Local config (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/orders/`
| File | Purpose |
|---|---|
| `src/index.js` | Express app, port 3004 |
| `src/config/db.js` | PostgreSQL pool (port 5433) |
| `src/middleware/verifyToken.js` | JWT validation |
| `src/routes/orders.js` | `GET /orders`, `GET /orders/:id`, `POST /orders` (transactional) |
| `src/db/migrate.js` | Runs 001_init.sql |
| `src/db/seed.js` | Runs seed.sql |
| `db/migrations/001_init.sql` | orders, order_items, shipping_addresses tables |
| `db/seed.sql` | 5 seeded orders with items + shipping |
| `.env` | Local config (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/cart/`
| File | Purpose |
|---|---|
| `src/index.js` | Express app, port 3002 |
| `src/config/redis.js` | ioredis client (port 6379) |
| `src/middleware/verifyToken.js` | JWT validation |
| `src/routes/cart.js` | GET/POST/PUT/DELETE cart endpoints |
| `.env` | Local config (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/checkout/`
| File | Purpose |
|---|---|
| `src/index.js` | Express app, port 3003 |
| `src/middleware/verifyToken.js` | JWT validation |
| `src/routes/checkout.js` | `POST /checkout` — fetch cart → create order → clear cart |
| `.env` | Local config (gitignored) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `Dockerfile` | Production container |

### `services/ui/`
| File | Purpose |
|---|---|
| `src/main.js` | App entry — mounts Vue, Pinia, Router |
| `src/App.vue` | Root — catches `?token=` from OAuth redirect |
| `src/router/index.js` | Routes + beforeEach auth guard |
| `src/stores/auth.js` | Pinia store — token, user, isAuthenticated, isAdmin |
| `src/services/api.js` | Axios instance with JWT interceptor + 401 handler |
| `src/views/LoginView.vue` | Login page with Google SSO button |
| `src/views/HomeView.vue` | Dashboard — summary cards + product grid |
| `src/views/CatalogView.vue` | Product grid, search, tag filter. Admin: Add Product form + Delete; Customer: Add to Cart |
| `src/views/CartView.vue` | Cart items, qty controls, shipping form, checkout |
| `src/views/OrdersView.vue` | Order history, status badges, expandable item details |
| `src/views/EnterpriseView.vue` | Tabbed table viewer — products/customers/orders + search |
| `src/components/Navbar.vue` | Navbar with all nav links, cart badge, avatar, logout |
| `src/stores/cart.js` | Pinia store — cart items, count, add/update/remove/clear |
| `src/assets/global.css` | Global reset + font |
| `vite.config.js` | Vite config — port 5174 |
| `package.json` | Dependencies |
| `.env` | VITE_* URLs for all 5 services |
| `Dockerfile` | Multi-stage: Vite build → nginx:alpine |
| `nginx.conf` | SPA routing (try_files → index.html) |

---

## 8. Environment Variables

### All services — actual `.env` values (gitignored)

```
# services/enterprise/.env
PORT=3000
DB_HOST=localhost
DB_PORT=5434
DB_NAME=enterprise_db
DB_USER=enterprise_user
DB_PASSWORD=password
GOOGLE_CLIENT_ID=<real value — in file>
GOOGLE_CLIENT_SECRET=<real value — in file>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod
SESSION_SECRET=nimbuscart_session_secret_2024_change_in_prod
FRONTEND_URL=http://localhost:5174

# services/catalog/.env
PORT=3001
DB_HOST=localhost
DB_PORT=5435
DB_NAME=catalog_db
DB_USER=catalog_user
DB_PASSWORD=password
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod
FRONTEND_URL=http://localhost:5174

# services/orders/.env
PORT=3004
DB_HOST=localhost
DB_PORT=5433
DB_NAME=orders_db
DB_USER=orders_user
DB_PASSWORD=password
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod
FRONTEND_URL=http://localhost:5174

# services/cart/.env
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod
FRONTEND_URL=http://localhost:5174

# services/checkout/.env
PORT=3003
CART_SERVICE_URL=http://localhost:3002
ORDERS_SERVICE_URL=http://localhost:3004
JWT_SECRET=nimbuscart_jwt_super_secret_2024_change_in_prod
FRONTEND_URL=http://localhost:5174

# services/ui/.env
VITE_ENTERPRISE_URL=http://localhost:3000
```

**Critical rule:** `JWT_SECRET` must be identical across all services.

**Google Cloud Console settings (must match exactly):**
- Project: `nimbuscart`
- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `http://localhost:3000/auth/google/callback`

---

## 9. Root-Level Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Single-command full stack startup — all services + DBs + Redis |
| `buildspec.yml` | AWS CodeBuild spec — Docker build, ECR push, ECS rolling deploy |
| `infrastructure/` | AWS CDK v2 (TypeScript) — full cloud infra as code |
| `infrastructure/bin/nimbuscart.ts` | CDK app entry point |
| `infrastructure/lib/nimbuscart-stack.ts` | Full stack: VPC, RDS×3, Redis, ECR×6, ECS Fargate×6, ALB, Secrets Manager, optional CodePipeline |
| `infrastructure/cdk.json` | CDK config + feature flags |

### docker-compose.yml key notes
- All DB connections use container names (e.g. `enterprise-db`) not `localhost`
- Services auto-run `npm run migrate` on startup via `command: sh -c "npm run migrate && npm start"`
- DB services have `healthcheck` — services wait (`condition: service_healthy`) before starting
- UI bakes VITE_* vars at build time via `build.args`
- To run: `docker compose up --build` from repo root

### buildspec.yml key notes
- Builds all 6 Docker images and pushes to ECR
- ECR repos expected: `nimbuscart-{enterprise,catalog,cart,orders,checkout,ui}`
- Triggers ECS rolling deploy via `aws ecs update-service --force-new-deployment`
- Required CodeBuild env vars: `AWS_ACCOUNT_ID`, `AWS_DEFAULT_REGION`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`, `FRONTEND_URL_ENTERPRISE/CATALOG/CART/CHECKOUT/ORDERS`

---

## 10. Local Dev — How to Run

### Start Docker containers
```bash
docker start nimbuscart-enterprise-db   # PostgreSQL :5434
docker start nimbuscart-catalog-db      # PostgreSQL :5435
docker start nimbuscart-orders-db       # PostgreSQL :5433
docker start nimbuscart-redis           # Redis :6379
```

### First-time DB setup (already done — skip if containers exist)
```bash
# enterprise
cd services/enterprise && npm run migrate && npm run seed

# catalog
cd services/catalog && npm run migrate && npm run seed

# orders
cd services/orders && npm run migrate && npm run seed
```

### Start all services (separate terminals or background)
```bash
cd services/enterprise && npm run dev   # :3000
cd services/catalog    && npm run dev   # :3001
cd services/cart       && npm run dev   # :3002
cd services/checkout   && npm run dev   # :3003
cd services/orders     && npm run dev   # :3004
cd services/ui         && npm run dev   # :5174
```

### Open browser
```
http://localhost:5174
```

**Kill a port if stuck:**
```bash
lsof -ti :PORT | xargs kill -9
```

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| `JWT_SECRET` must match across all services | Same value in each service's `.env` |
| CORS must allow Vue origin | Every service enables CORS for `http://localhost:5174` |
| Catalog DB uses port 5435 locally (not 5432) | Port 5432 occupied by unrelated project on dev machine |
| checkout fails if cart or orders service is down | Returns clear error with upstream status code |
| Google OAuth callback URL must match exactly | Set in Google Console: `http://localhost:3000/auth/google/callback` |

---

## 12. Latest Checkpoint

- **Date:** 2026-05-07
- **Checkpoint:** Documentation consolidated into README.md (10 sections: summary, architecture, service map, auth/RBAC, DB schemas, local dev, CDK deploy, CI/CD, base repo comparison, future scope P0-P3). AWS CDK v2 stack complete (`infrastructure/`). TypeScript compiles clean (0 errors). Provisions: VPC, SGs, Secrets Manager, RDS PostgreSQL×3, ElastiCache Redis, ECR×6, ECS Fargate cluster, 6 Fargate services (fromAsset Docker builds), ALB with path-based routing (priorities 10–50 + UI as default), CloudWatch log groups, optional CodePipeline+CodeBuild wired to buildspec.yml via githubConnectionArn context.
- **Next:** Documentation — docs/architecture.md, docs/deployment.md, docs/future-scope.md.

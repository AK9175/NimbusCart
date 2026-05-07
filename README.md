# NimbusCart

**Cloud-Native Retail and Enterprise Data Portal** — built for CMPE-282

NimbusCart is a microservices-based e-commerce and enterprise analytics platform featuring Google OAuth 2.0 federated authentication, JWT-based RBAC, and full AWS-native CI/CD. All services are written from scratch in Node.js/Express with a Vue 3 frontend.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Architecture](#2-architecture)
3. [Service Map](#3-service-map)
4. [Authentication & RBAC](#4-authentication--rbac)
5. [Database Schemas](#5-database-schemas)
6. [Local Development](#6-local-development)
7. [Cloud Deployment (AWS CDK)](#7-cloud-deployment-aws-cdk)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Repository Structure](#9-repository-structure)

---

## 1. Project Summary

| Attribute | Value |
|---|---|
| **Frontend** | Vue 3 + Vite + Pinia |
| **Backend** | Node.js / Express (6 microservices) |
| **Auth** | Google OAuth 2.0 + JWT (7-day, stateless) |
| **RBAC** | `admin` / `customer` roles embedded in JWT |
| **Datastores** | PostgreSQL ×3, Redis |
| **IaC** | AWS CDK v2 (TypeScript) |
| **CI/CD** | AWS CodePipeline + CodeBuild |
| **Deployment** | ECS Fargate + ALB (path-based routing) |
| **Local dev** | Docker Compose (single command) |

---

## 2. Architecture

### Local Stack

```
Browser (localhost:5174)
        │  Authorization: Bearer <JWT>
        ├──────────────────────────────────────────────────────┐
        │                                                      │
        ▼                                                      ▼
┌─────────────────┐    ┌─────────────┐    ┌─────────────────────┐
│  enterprise     │    │  catalog    │    │  cart        :3002  │
│  :3000          │    │  :3001      │    │  Redis :6379        │
│  Google OAuth   │    │  Products + │    └─────────────────────┘
│  JWT sign/verify│    │  Tags CRUD  │
│  RBAC guard     │    │  RBAC write │    ┌─────────────────────┐
│  Enterprise APIs│    │  protection │    │  checkout    :3003  │
└────────┬────────┘    └──────┬──────┘    │  cart→order→clear  │
         │                   │            └─────────────────────┘
  ┌──────▼──────┐    ┌───────▼──────┐
  │enterprise-db│    │  catalog-db  │     ┌─────────────────────┐
  │ PG :5434    │    │  PG :5435    │     │  orders      :3004  │
  └─────────────┘    └──────────────┘     │  orders-db PG :5433 │
                                          └─────────────────────┘
```

### AWS Cloud Architecture

```
Internet → ALB (internet-facing)
              │
              ├── /auth/*            → enterprise  :3000  (ECS Fargate)
              ├── /api/enterprise/*  → enterprise  :3000
              ├── /products/*        → catalog     :3001  (ECS Fargate)
              ├── /cart/*            → cart        :3002  (ECS Fargate)
              ├── /checkout/*        → checkout    :3003  (ECS Fargate)
              ├── /orders/*          → orders      :3004  (ECS Fargate)
              └── /* (default)       → ui          :80    (ECS Fargate / nginx)

Private Subnet:
  ├── ECS Fargate cluster (6 services)
  ├── RDS PostgreSQL ×3  (enterprise-db, catalog-db, orders-db)
  └── ElastiCache Redis  (cart sessions)

Secrets Manager → DB passwords, JWT_SECRET, Google OAuth credentials
CloudWatch Logs → /ecs/nimbuscart-* (1-week retention)
ECR             → nimbuscart-{enterprise,catalog,cart,orders,checkout,ui}
```

### CDK Stack Resources

| Resource | Config |
|---|---|
| VPC | 2 AZs, 1 NAT Gateway, public + private subnets |
| Security Groups | ALB (80/443), ECS (from ALB + inter-service), DB (5432), Redis (6379) |
| Secrets Manager | App secrets + 3 auto-generated DB passwords |
| RDS PostgreSQL ×3 | enterprise, catalog, orders — db.t3.micro, 20 GB |
| ElastiCache Redis | cache.t3.micro, single node |
| ECR Repos ×6 | Lifecycle: keep last 5 images |
| ECS Fargate ×6 | 256 vCPU / 512 MB, circuit breaker with rollback |
| ALB | Internet-facing, path-based routing |
| IAM | Separate execution + task roles, least-privilege |
| CloudWatch | Per-service log groups, 1-week retention |
| CodePipeline + CodeBuild | Optional — enabled via `githubConnectionArn` context |

---

## 3. Service Map

| Service | Port (local) | Datastore | Responsibilities |
|---|---|---|---|
| `enterprise` | 3000 | PostgreSQL (enterprise-db) | Google OAuth, JWT sign/verify, RBAC, enterprise read APIs |
| `catalog` | 3001 | PostgreSQL (catalog-db) | Product + tag CRUD; POST/DELETE admin-only |
| `cart` | 3002 | Redis | Per-user cart with 7-day TTL |
| `checkout` | 3003 | None | Orchestrates: fetch cart → create order → clear cart |
| `orders` | 3004 | PostgreSQL (orders-db) | Order history, status tracking |
| `ui` | 5174 (dev) / 80 (prod) | None | Vue 3 SPA served via nginx |

### Inter-service communication

Only `checkout` calls other services. All others are fully independent.

```
checkout → GET  /cart/:userId       (cart service)
checkout → POST /orders             (orders service)
checkout → DELETE /cart/:userId     (cart service)
```

In production, all calls go through the ALB. `CART_SERVICE_URL` and `ORDERS_SERVICE_URL` both point to the ALB base URL; path-based routing delivers to the correct service.

---

## 4. Authentication & RBAC

### OAuth + JWT Flow

```
User clicks "Sign in with Google"
  → browser → /auth/google (enterprise service)
  → Google OAuth consent
  → /auth/google/callback
  → Passport.js upserts user in enterprise-db
  → JWT signed with JWT_SECRET (7-day expiry)
      payload: { id, email, name, avatar, role }
  → redirect to frontend /?token=JWT
  → Vue catches token → localStorage + Pinia auth store
  → All subsequent API calls: Authorization: Bearer <JWT>
  → Each service validates JWT independently (shared JWT_SECRET)
```

### Roles

| Role | Assigned | Can do |
|---|---|---|
| `customer` | Default on signup | Browse catalog, cart, place orders, track orders |
| `admin` | Manual DB promotion | Everything above + Enterprise dashboard + catalog write (add/delete products) |

### Promote a user to admin

```sql
-- enterprise-db
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
-- User must re-login — new JWT is issued with updated role
```

### Enforcement

| Layer | Mechanism |
|---|---|
| Backend | `requireRole('admin')` middleware on `POST /products`, `DELETE /products/:id`, all `/api/enterprise/*` routes |
| Frontend router | `meta: { requiresRole: 'admin' }` on `/enterprise` route — redirects customers to `/` |
| Frontend UI | `auth.isAdmin` computed — conditionally renders stat cards, Add Product form, Delete buttons, Enterprise nav link |

---

## 5. Database Schemas

**enterprise-db**
```sql
users        (id UUID, google_id, email, name, avatar, role DEFAULT 'customer', created_at)
customers    (id SERIAL, name, email, company, phone, created_at)
products     (id SERIAL, name, description, price, stock, image_url, created_at)
orders       (id SERIAL, customer_id FK, status, total, created_at)
order_items  (id SERIAL, order_id FK, product_id, product_name, quantity, unit_price)
```

**catalog-db**
```sql
products      (id SERIAL, name, description, price NUMERIC, stock INT, image_url, created_at)
tags          (id SERIAL, name VARCHAR UNIQUE)
product_tags  (product_id FK, tag_id FK, PRIMARY KEY(product_id, tag_id))
```

**orders-db**
```sql
orders             (id UUID, user_id, status, total NUMERIC, created_at)
order_items        (id UUID, order_id FK, product_id, product_name, quantity, unit_price)
shipping_addresses (id UUID, order_id FK, name, street, city, state, zip, country)
```

**Redis**
```
Key:   cart:{user_id}
Value: JSON → [{ productId, name, price, quantity }]
TTL:   7 days (reset on every write)
```

---

## 6. Local Development

### Option A — Docker Compose (recommended)

```bash
# 1. Create .env files
cp services/enterprise/.env.example services/enterprise/.env
# Edit services/enterprise/.env — fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# JWT_SECRET must be identical in every service .env

# 2. Start full stack (services + DBs + Redis)
docker compose up --build

# 3. Seed data (first run only)
docker compose exec enterprise npm run seed
docker compose exec catalog    npm run seed
docker compose exec orders     npm run seed
```

App runs at **http://localhost:5174**

### Option B — Individual services (dev mode)

```bash
# Start DB containers
docker run -d --name nimbuscart-enterprise-db \
  -e POSTGRES_USER=enterprise_user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=enterprise_db -p 5434:5432 postgres:15

docker run -d --name nimbuscart-catalog-db \
  -e POSTGRES_USER=catalog_user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=catalog_db -p 5435:5432 postgres:15

docker run -d --name nimbuscart-orders-db \
  -e POSTGRES_USER=orders_user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=orders_db -p 5433:5432 postgres:15

docker run -d --name nimbuscart-redis -p 6379:6379 redis:7

# Migrate + seed
cd services/enterprise && npm run migrate && npm run seed
cd services/catalog    && npm run migrate && npm run seed
cd services/orders     && npm run migrate && npm run seed

# Run each service in its own terminal
cd services/enterprise && npm run dev   # :3000
cd services/catalog    && npm run dev   # :3001
cd services/cart       && npm run dev   # :3002
cd services/checkout   && npm run dev   # :3003
cd services/orders     && npm run dev   # :3004
cd services/ui         && npm run dev   # :5174
```

### Google OAuth setup (required)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Authorized JavaScript origins: `http://localhost:3000`
3. Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
4. Paste Client ID + Secret into `services/enterprise/.env`

---

## 7. Cloud Deployment (AWS CDK)

### Prerequisites

```bash
npm install -g aws-cdk
aws configure          # set up credentials
cd infrastructure && npm install
```

### Deploy (two-pass for UI URL)

```bash
# Bootstrap CDK (one-time per account/region)
npx cdk bootstrap

# 1st deploy — creates all infrastructure
npx cdk deploy \
  -c googleClientId=<ID> \
  -c googleClientSecret=<SECRET> \
  -c jwtSecret=<STRONG_RANDOM_SECRET> \
  -c sessionSecret=<STRONG_RANDOM_SECRET>

# Copy AlbUrl from stack outputs
# Add http://<ALB_DNS>/auth/google/callback to Google Cloud Console

# 2nd deploy — rebuilds UI with real API base URL baked in
npx cdk deploy \
  -c albUrl=http://<ALB_DNS_FROM_OUTPUT> \
  -c googleClientId=<ID> \
  -c googleClientSecret=<SECRET> \
  -c jwtSecret=<SAME_AS_ABOVE> \
  -c sessionSecret=<SAME_AS_ABOVE>
```

### Teardown

```bash
npx cdk destroy   # removes all AWS resources including RDS data
```

### Why two passes?

The Vue UI bakes `VITE_*` API URLs at Docker build time. The ALB DNS is only known after the first `cdk deploy`. The second deploy rebuilds the UI image with the real URL.

---

## 8. CI/CD Pipeline

### How it works

```
git push origin main
        │
        ▼
AWS CodePipeline (Source — GitHub webhook)
        │
        ▼
AWS CodeBuild (buildspec.yml)
  ├── ECR login
  ├── docker build × 6 services
  ├── docker push → ECR (nimbuscart-*)
  └── aws ecs update-service --force-new-deployment × 6
        │
        ▼
ECS rolling deploy → live at ALB URL
```

### Enable CodePipeline via CDK

```bash
# 1. AWS Console → CodePipeline → Settings → Connections → Create connection → GitHub
# 2. Copy the connection ARN

npx cdk deploy \
  -c githubConnectionArn=arn:aws:codestar-connections:us-west-2:<ACCT>:<ID> \
  -c githubOwner=<your-github-org> \
  -c githubRepo=NimbusCart \
  -c githubBranch=main \
  -c albUrl=http://<ALB_DNS> \
  -c googleClientId=<ID> \
  -c googleClientSecret=<SECRET> \
  -c jwtSecret=<SECRET> \
  -c sessionSecret=<SECRET>
```

Sensitive values (Google OAuth, JWT secrets) are pulled from Secrets Manager at CodeBuild time — never stored in the buildspec or environment variables in plaintext.

---

## 9. Repository Structure

```
NimbusCart/
├── services/
│   ├── enterprise/          Node.js — OAuth, JWT, RBAC, enterprise APIs
│   ├── catalog/             Node.js — product + tag management
│   ├── cart/                Node.js — Redis cart
│   ├── checkout/            Node.js — checkout orchestrator
│   ├── orders/              Node.js — order history
│   └── ui/                  Vue 3 + Vite — frontend SPA
├── infrastructure/
│   ├── bin/nimbuscart.ts    CDK app entry
│   └── lib/nimbuscart-stack.ts  Full AWS CDK stack
├── docker-compose.yml       Single-command local stack
├── buildspec.yml            AWS CodeBuild spec
└── README.md                This file
```

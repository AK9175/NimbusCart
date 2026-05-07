# NimbusCart

NimbusCart is a microservices-based e-commerce platform featuring Google OAuth 2.0 federated authentication, JWT-based RBAC, and full AWS-native CI/CD. All services are written from scratch in Node.js/Express with a Vue 3 frontend.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Service Map](#service-map)
4. [Authentication & RBAC](#authentication--rbac)
5. [Database Schemas](#database-schemas)
6. [Local Development](#local-development)
7. [Cloud Deployment (AWS CDK)](#cloud-deployment-aws-cdk)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Repository Structure](#repository-structure)

---

## Features

- Google OAuth 2.0 sign-in
- JWT-based stateless authentication (7-day expiry)
- Role-based access control (`customer` / `admin`)
- Product catalog browsing with tag filtering
- Redis-backed cart with 7-day TTL per user
- Checkout flow that creates orders and clears the cart
- Customer order history and order tracking
- Admin enterprise dashboard for products, customers, orders, and revenue summary
- Full AWS cloud deployment — ECS Fargate, RDS, ElastiCache, ALB, ECR, Secrets Manager, CloudWatch
- Optional CI/CD with AWS CodePipeline + CodeBuild

---

## Architecture

### AWS Cloud Architecture

![NimbusCart AWS Architecture](diagrams/aws_architecture_clean.png)

### Application Actors

![NimbusCart Application Actors](diagrams/nimbuscart_application_actors.png)

### ALB Path-Based Routing

```
Internet → ALB (internet-facing, HTTP :80)
              │
              ├── /auth/*            → enterprise  :3000  (ECS Fargate)
              ├── /api/enterprise/*  → enterprise  :3000
              ├── /products/*        → catalog     :3001  (ECS Fargate)
              ├── /cart/*            → cart         :3002  (ECS Fargate)
              ├── /checkout/*        → checkout     :3003  (ECS Fargate)
              ├── /orders/*          → orders       :3004  (ECS Fargate)
              └── /* (default)       → ui           :80   (ECS Fargate / nginx)
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

## Service Map

| Service | Port (local) | Datastore | Responsibilities |
|---|---|---|---|
| `enterprise` | 3000 | PostgreSQL (enterprise-db) | Google OAuth, JWT sign/verify, RBAC, enterprise read APIs |
| `catalog` | 3001 | PostgreSQL (catalog-db) | Product + tag CRUD; POST/DELETE admin-only |
| `cart` | 3002 | Redis | Per-user cart with 7-day TTL |
| `checkout` | 3003 | None | Orchestrates: fetch cart → create order → clear cart |
| `orders` | 3004 | PostgreSQL (orders-db) | Order history, status tracking |
| `ui` | 5174 (dev) / 80 (prod) | None | Vue 3 SPA served via nginx |

### Inter-Service Communication

Only `checkout` calls other services. All others are fully independent.

```
checkout → GET    /cart/:userId    (cart service)
checkout → POST   /orders          (orders service)
checkout → DELETE /cart/:userId    (cart service)
```

In production, all inter-service calls go through the ALB. `CART_SERVICE_URL` and `ORDERS_SERVICE_URL` both point to the ALB base URL; path-based routing delivers to the correct service.

---

## Authentication & RBAC

### OAuth + JWT Flow

```
User clicks "Sign in with Google"
  → browser → /auth/google (enterprise service)
  → Google OAuth consent screen
  → /auth/google/callback
  → Passport.js upserts user in enterprise-db
  → JWT signed with JWT_SECRET (7-day expiry)
      payload: { id, email, name, avatar, role }
  → redirect to frontend /?token=JWT
  → Vue router guard captures token → localStorage + Pinia auth store
  → All subsequent API calls: Authorization: Bearer <JWT>
  → Each service validates JWT independently (shared JWT_SECRET)
```

### RBAC Enforcement

| Layer | Mechanism |
|---|---|
| Backend | `requireRole('admin')` middleware on `POST /products`, `DELETE /products/:id`, all `/api/enterprise/*` routes |
| Frontend router | `meta: { requiresRole: 'admin' }` on `/enterprise` route — redirects customers to `/` |
| Frontend UI | `auth.isAdmin` computed — conditionally renders enterprise nav link, stat cards, Add Product form, Delete buttons |

---

## Database Schemas

**enterprise-db**
```sql
users        (id SERIAL, google_id, email, name, avatar, role DEFAULT 'customer', created_at)
customers    (id SERIAL, name, email UNIQUE, company, phone, created_at)
products     (id SERIAL, name UNIQUE, description, price, stock, image_url, created_at)
orders       (id SERIAL, customer_id FK, status, total, created_at)
order_items  (id SERIAL, order_id FK, product_id, product_name, quantity, unit_price)
```

**catalog-db**
```sql
products      (id SERIAL, name UNIQUE, description, price NUMERIC, stock INT, image_url, created_at)
tags          (id SERIAL, name VARCHAR UNIQUE)
product_tags  (product_id FK, tag_id FK, PRIMARY KEY(product_id, tag_id))
```

**orders-db**
```sql
orders             (id SERIAL, user_id, status, total NUMERIC, created_at)
order_items        (id SERIAL, order_id FK, product_id, product_name, quantity, unit_price)
shipping_addresses (id SERIAL, order_id FK, name, street, city, state, zip, country)
```

**Redis**
```
Key:   cart:{user_id}
Value: JSON → [{ productId, name, price, quantity }]
TTL:   7 days (reset on every write)
```

---

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and npm (if running services outside Docker)
- Google OAuth 2.0 client credentials

### Option A — Docker Compose (recommended)

```bash
# 1. Create .env file
cp services/enterprise/.env.example services/enterprise/.env
# Edit and fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET

# 2. Start full stack (all services + DBs + Redis)
docker compose up --build

# 3. Seed data (first run only)
docker compose exec enterprise npm run seed
docker compose exec catalog    npm run seed
docker compose exec orders     npm run seed
```

App runs at **http://localhost:5174**

### Option B — Individual Services (dev mode)

```bash
# Start DB and Redis containers
docker compose up -d enterprise-db catalog-db orders-db redis

# Migrate + seed each service
cd services/enterprise && npm install && npm run migrate && npm run seed
cd services/catalog    && npm install && npm run migrate && npm run seed
cd services/orders     && npm install && npm run migrate && npm run seed

# Run each service in its own terminal
cd services/enterprise && npm run dev   # :3000
cd services/catalog    && npm run dev   # :3001
cd services/cart       && npm run dev   # :3002
cd services/checkout   && npm run dev   # :3003
cd services/orders     && npm run dev   # :3004
cd services/ui         && npm run dev   # :5174
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized JavaScript origins: `http://localhost:3000`
4. Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
5. Paste Client ID + Secret into `services/enterprise/.env`

---

## Cloud Deployment (AWS CDK)

### Prerequisites

```bash
npm install -g aws-cdk
aws configure          # set up AWS credentials
cd infrastructure && npm install
npx cdk bootstrap      # one-time per account/region
```

### Deploy (two-pass for UI URL)

```bash
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

> **Why two passes?** The Vue UI bakes `VITE_*` API URLs at Docker build time. The ALB DNS is only known after the first deploy. The second deploy rebuilds the UI image with the real URL.

### Teardown

```bash
npx cdk destroy   # removes all AWS resources including RDS data
```

---

## CI/CD Pipeline

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
  -c githubConnectionArn=arn:aws:codestar-connections:... \
  -c githubOwner=<your-github-org> \
  -c githubRepo=NimbusCart \
  -c githubBranch=main \
  -c albUrl=http://<ALB_DNS> \
  -c googleClientId=<ID> \
  -c googleClientSecret=<SECRET> \
  -c jwtSecret=<SECRET> \
  -c sessionSecret=<SECRET>
```

Sensitive values (Google OAuth, JWT secrets) are pulled from Secrets Manager at CodeBuild time — never stored in plaintext.

---

## Repository Structure

```
NimbusCart/
├── diagrams/                     Architecture and actor diagrams
├── infrastructure/
│   ├── bin/nimbuscart.ts         CDK app entry
│   └── lib/nimbuscart-stack.ts   Full AWS CDK stack
├── services/
│   ├── enterprise/               Node.js — OAuth, JWT, RBAC, enterprise APIs
│   ├── catalog/                  Node.js — product + tag management
│   ├── cart/                     Node.js — Redis cart
│   ├── checkout/                 Node.js — checkout orchestrator
│   ├── orders/                   Node.js — order history
│   └── ui/                       Vue 3 + Vite — frontend SPA
├── buildspec.yml                 AWS CodeBuild spec
├── docker-compose.yml            Single-command local stack
└── README.md
```
<!-- 
### Diagram Sources

The architecture diagrams in this README are located in the `diagrams/` directory:

- `diagrams/aws_architecture_clean.png` — AWS cloud architecture
- `diagrams/nimbuscart_application_actors.png` — Application actor diagram
-->

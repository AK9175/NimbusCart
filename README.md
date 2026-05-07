# Cloud Services Project

## University : [San Jose State University](http://www.sjsu.edu/)
## Course: CMPE 282 - Cloud Services
## Professor: Andrew Bond

## Team :
Student Name      |
-------------     |
Akshay Sunil Navani |
Atharva Kulkarni |
Joshini Naagraj |
Shantanu Zadbuke |

## Project : NimbusCart

### Introduction

NimbusCart is a microservices-based e-commerce platform with Google OAuth 2.0 federated authentication, JWT-based RBAC, and AWS-native CI/CD. All services are built in Node.js/Express with a Vue 3 frontend.

The application includes a customer shopping flow, Redis-backed cart, checkout orchestration, order tracking, and an admin Enterprise Data Viewer for products, customers, orders, and revenue summary data.

The application supports two roles:

* Customer - Browse products, manage cart, checkout, view orders, and track order status.
* Admin - Customer access plus Enterprise Data Viewer and catalog product management.

## Features

- Google OAuth 2.0 sign-in
- JWT-based stateless authentication
- Role-based access control for `customer` and `admin`
- Product catalog browsing with tag filtering
- Redis-backed cart management with per-user TTL
- Checkout flow that creates orders and clears the cart
- Customer order history and tracking
- Admin enterprise dashboard for products, customers, orders, and revenue summary
- AWS deployment with ECS Fargate, RDS, ElastiCache, ALB, ECR, Secrets Manager, CloudWatch, CodePipeline, and CodeBuild

## Architecture

### AWS Cloud Architecture

![](diagrams/aws_architecture_clean.png)

### Application Actors

![NimbusCart Application Actors](diagrams/nimbuscart_application_actors.png)

## Services

| Service | Port | Data Store | Responsibilities |
|---|---:|---|---|
| `ui` | 5174 | None | Vue 3 frontend SPA |
| `enterprise` | 3000 | PostgreSQL | Google OAuth, JWT, RBAC, enterprise APIs |
| `catalog` | 3001 | PostgreSQL | Product and tag APIs; admin product writes |
| `cart` | 3002 | Redis | Per-user cart storage with 7-day TTL |
| `checkout` | 3003 | None | Fetch cart, create order, clear cart |
| `orders` | 3004 | PostgreSQL | Order history and status tracking |

## User Roles

| Role | Access |
|---|---|
| `customer` | Browse catalog, manage cart, checkout, view orders, track order status |
| `admin` | Customer access plus enterprise dashboard and catalog product management |

New users are assigned the `customer` role by default. Admin access is granted by updating the user role in the enterprise database.

## Authentication and RBAC

1. User signs in with Google.
2. The `enterprise` service handles the OAuth callback.
3. A JWT is issued with user identity and role.
4. The frontend stores the token.
5. API requests send the token using `Authorization: Bearer <token>`.
6. Backend services verify the JWT independently using the shared `JWT_SECRET`.
7. Admin-only APIs and frontend routes are protected with role checks.

## Data Stores

| Data Store | Main Data |
|---|---|
| `enterprise-db` | users, customers, products, orders, order items |
| `catalog-db` | products, tags, product tags |
| `orders-db` | orders, order items, shipping addresses |
| Redis | `cart:{user_id}` JSON cart data with 7-day TTL |

## Local Development

### Prerequisites

- Docker
- Docker Compose
- Node.js and npm, if running services outside Docker
- Google OAuth 2.0 client credentials

### Setup

Create the enterprise environment file:

```bash
cp services/enterprise/.env.example services/enterprise/.env
```

Update `services/enterprise/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-shared-jwt-secret
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:5174
```

Use the same `JWT_SECRET` for all backend services.

### Run with Docker Compose

```bash
docker compose up --build
```

Application URL:

```text
http://localhost:5174
```

## AWS Deployment

Infrastructure is defined with AWS CDK in the `infrastructure/` directory.

The stack provisions ECS Fargate services, RDS PostgreSQL databases, ElastiCache Redis, ECR repositories, an Application Load Balancer, Secrets Manager, CloudWatch logs, and optional CodePipeline/CodeBuild CI/CD.

Deploy from the infrastructure directory:

```bash
cd infrastructure
npm install
npm run build
npx cdk deploy
```

After the first deployment, add the ALB OAuth callback URL to Google Cloud Console, then redeploy with the final callback configuration if needed.

## CI/CD

The root `buildspec.yml` builds Docker images, pushes them to Amazon ECR, and triggers ECS service updates.

CI/CD uses:

- AWS CodePipeline
- AWS CodeBuild
- Amazon ECR
- Amazon ECS Fargate

## Repository Structure

```text
NimbusCart/
├── diagrams/                 # Architecture and actor diagrams
├── infrastructure/           # AWS CDK infrastructure
├── services/
│   ├── ui/                   # Frontend application
│   ├── enterprise/           # Auth, RBAC, enterprise APIs
│   ├── catalog/              # Product catalog service
│   ├── cart/                 # Cart service
│   ├── checkout/             # Checkout orchestration service
│   └── orders/               # Orders service
├── buildspec.yml             # AWS CodeBuild build spec
├── docker-compose.yml        # Local development stack
└── README.md
```

### [Project Report](reports/NimbusCart_Project_Report.docx)
### [HTML Project Report](reports/NimbusCart_Project_Report.html)

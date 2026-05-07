# NimbusCart

NimbusCart is a cloud-native retail and enterprise data portal built with microservices, Google OAuth 2.0 authentication, role-based access control, and AWS deployment support.

The application includes a customer shopping experience, an admin-only enterprise dashboard, cart and checkout flows, order tracking, and AWS-native CI/CD.

## Features

- Google OAuth 2.0 sign-in
- JWT-based authentication
- Role-based access control for `customer` and `admin`
- Product catalog browsing
- Cart management with Redis-backed storage
- Checkout flow that creates orders and clears the cart
- Customer order history and order tracking
- Admin enterprise dashboard for products, customers, orders, and summary data
- AWS cloud deployment with ECS Fargate, RDS, ElastiCache, ALB, CloudFront, ECR, CodePipeline, and CodeBuild

## Architecture

### AWS Cloud Architecture

![NimbusCart AWS Architecture](diagrams/aws_architecture_clean.png)

### Application Actors

![NimbusCart Application Actors](diagrams/nimbuscart_application_actors.png)

## Services

| Service | Purpose | Data Store |
|---|---|---|
| `ui` | Frontend web application | None |
| `enterprise` | Google OAuth, JWT, RBAC, enterprise APIs | PostgreSQL `enterprise-db` |
| `catalog` | Product catalog and admin product writes | PostgreSQL `catalog-db` |
| `cart` | User cart storage and cart updates | Redis |
| `checkout` | Checkout orchestration | None |
| `orders` | Order creation, history, and status tracking | PostgreSQL `orders-db` |

## User Roles

| Role | Access |
|---|---|
| `customer` | Browse catalog, manage cart, checkout, view orders, track order status |
| `admin` | Customer access plus enterprise dashboard and catalog product management |

New users are assigned the `customer` role by default. Admin access is granted by updating the user role in `enterprise-db`.

## Authentication Flow

1. User signs in with Google.
2. The `enterprise` service handles the OAuth callback.
3. A JWT is issued with user identity and role.
4. The frontend stores the token.
5. API requests send the token using `Authorization: Bearer <token>`.
6. Backend services verify the JWT and enforce RBAC.

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

Update `services/enterprise/.env` with:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-shared-jwt-secret
FRONTEND_URL=http://localhost:5174
```

Use the same `JWT_SECRET` for all backend services.

### Run with Docker Compose

```bash
docker compose up --build
```

The application runs at:

```text
http://localhost:5174
```

## AWS Deployment

Infrastructure is defined with AWS CDK in the `infrastructure/` directory.

The stack provisions:

- VPC with public and private subnets
- Application Load Balancer
- ECS Fargate services
- Amazon RDS PostgreSQL databases
- Amazon ElastiCache Redis
- Amazon ECR repositories
- AWS Secrets Manager
- Amazon CloudWatch log groups
- Optional AWS CodePipeline and CodeBuild CI/CD

Deploy from the infrastructure directory:

```bash
cd infrastructure
npm install
npm run build
cdk deploy
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
├── diagrams/                 # Architecture and UML diagrams
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

## Diagram Sources

The diagrams used in this README are generated from:

- `diagrams/aws_architecture_clean.py`
- `diagrams/nimbuscart_application_actors.puml`

Regenerate the diagrams with:

```bash
python diagrams/aws_architecture_clean.py
plantuml diagrams/nimbuscart_application_actors.puml
```

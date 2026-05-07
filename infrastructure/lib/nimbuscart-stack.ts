import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * NimbusCartStack — provisions the full AWS infrastructure for NimbusCart:
 *
 *   VPC → RDS (×3) → ElastiCache Redis → ECR repos (×6) → ECS Fargate (×6 services)
 *   → ALB with path-based routing → Secrets Manager → CloudWatch Logs
 *   → CodePipeline + CodeBuild (optional, requires githubConnectionArn context)
 *
 * --- Deploy order ---
 *   1st deploy (creates all infra, UI baked with placeholder API URL):
 *     npx cdk deploy \
 *       -c googleClientId=<ID> \
 *       -c googleClientSecret=<SECRET> \
 *       -c jwtSecret=<your-secret> \
 *       -c sessionSecret=<your-secret>
 *
 *   Get ALB URL from stack output: NimbusCartStack.AlbUrl
 *
 *   2nd deploy (rebuilds UI image with real ALB URL baked in):
 *     npx cdk deploy \
 *       -c albUrl=http://<ALB_DNS_FROM_OUTPUT> \
 *       -c googleClientId=<ID> \
 *       -c googleClientSecret=<SECRET> \
 *       -c jwtSecret=<your-secret> \
 *       -c sessionSecret=<your-secret>
 *
 *   Optional — wire up CodePipeline (requires a GitHub Connection in AWS Console):
 *     npx cdk deploy \
 *       -c githubConnectionArn=arn:aws:codestar-connections:... \
 *       -c githubOwner=<your-github-user-or-org> \
 *       -c githubRepo=NimbusCart \
 *       ... (other context vars above)
 *
 *   Teardown (removes ALL resources including RDS data):
 *     npx cdk destroy
 */
export class NimbusCartStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────────────────────────────
    // Context Variables
    // Pass these via: cdk deploy -c key=value
    // ─────────────────────────────────────────────────────────────────────
    const albUrl             = this.node.tryGetContext('albUrl')             as string | undefined;
    const jwtSecret          = this.node.tryGetContext('jwtSecret')          as string || 'nimbuscart_jwt_super_secret_change_in_prod';
    const sessionSecret      = this.node.tryGetContext('sessionSecret')      as string || 'nimbuscart_session_secret_change_in_prod';
    const googleClientId     = this.node.tryGetContext('googleClientId')     as string || '';
    const googleClientSecret = this.node.tryGetContext('googleClientSecret') as string || '';
    const githubConnectionArn = this.node.tryGetContext('githubConnectionArn') as string | undefined;
    const githubOwner        = this.node.tryGetContext('githubOwner')        as string || 'your-github-org';
    const githubRepo         = this.node.tryGetContext('githubRepo')         as string || 'NimbusCart';
    const githubBranch       = this.node.tryGetContext('githubBranch')       as string || 'main';

    // ─────────────────────────────────────────────────────────────────────
    // VPC — 2 AZs, public + private subnets, 1 NAT Gateway
    // ─────────────────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: 'nimbuscart-vpc',
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: 'public',  subnetType: ec2.SubnetType.PUBLIC,                cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,   cidrMask: 24 },
      ],
    });

    // ─────────────────────────────────────────────────────────────────────
    // Security Groups
    // ─────────────────────────────────────────────────────────────────────
    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc,
      securityGroupName: 'nimbuscart-alb-sg',
      description: 'Allow HTTP/HTTPS inbound to ALB',
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80),  'HTTP');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

    const ecsSg = new ec2.SecurityGroup(this, 'EcsSg', {
      vpc,
      securityGroupName: 'nimbuscart-ecs-sg',
      description: 'Allow traffic from ALB to ECS tasks',
    });
    ecsSg.addIngressRule(albSg, ec2.Port.allTcp(), 'From ALB');
    // Allow ECS tasks to call each other (checkout → cart, checkout → orders)
    ecsSg.addIngressRule(ecsSg, ec2.Port.allTcp(), 'Inter-service communication');

    const dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc,
      securityGroupName: 'nimbuscart-db-sg',
      description: 'Allow PostgreSQL from ECS',
    });
    dbSg.addIngressRule(ecsSg, ec2.Port.tcp(5432), 'PostgreSQL from ECS');

    const redisSg = new ec2.SecurityGroup(this, 'RedisSg', {
      vpc,
      securityGroupName: 'nimbuscart-redis-sg',
      description: 'Allow Redis from ECS',
    });
    redisSg.addIngressRule(ecsSg, ec2.Port.tcp(6379), 'Redis from ECS');

    // ─────────────────────────────────────────────────────────────────────
    // Secrets Manager — application secrets (Google OAuth, JWT)
    // DB passwords are generated separately per-database below.
    // ─────────────────────────────────────────────────────────────────────
    const appSecrets = new secretsmanager.Secret(this, 'AppSecrets', {
      secretName: 'nimbuscart/prod',
      description: 'NimbusCart application secrets — Google OAuth + JWT',
      secretObjectValue: {
        JWT_SECRET:            cdk.SecretValue.unsafePlainText(jwtSecret),
        SESSION_SECRET:        cdk.SecretValue.unsafePlainText(sessionSecret),
        GOOGLE_CLIENT_ID:      cdk.SecretValue.unsafePlainText(googleClientId),
        GOOGLE_CLIENT_SECRET:  cdk.SecretValue.unsafePlainText(googleClientSecret),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────
    // RDS — Enterprise DB (users, customers, products, orders — enterprise view)
    // ─────────────────────────────────────────────────────────────────────
    const enterpriseDbSecret = new secretsmanager.Secret(this, 'EnterpriseDbSecret', {
      secretName: 'nimbuscart/enterprise-db',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'enterprise_user' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\ ',
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const enterpriseDb = new rds.DatabaseInstance(this, 'EnterpriseDb', {
      instanceIdentifier: 'nimbuscart-enterprise',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets:    { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      databaseName:  'enterprise_db',
      credentials:   rds.Credentials.fromSecret(enterpriseDbSecret),
      multiAz:       false,
      allocatedStorage:    20,
      maxAllocatedStorage: 50,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────
    // RDS — Catalog DB (products, tags, product_tags)
    // Note: in prod this uses standard port 5432 (port conflict only on local dev)
    // ─────────────────────────────────────────────────────────────────────
    const catalogDbSecret = new secretsmanager.Secret(this, 'CatalogDbSecret', {
      secretName: 'nimbuscart/catalog-db',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'catalog_user' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\ ',
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const catalogDb = new rds.DatabaseInstance(this, 'CatalogDb', {
      instanceIdentifier: 'nimbuscart-catalog',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets:    { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      databaseName:  'catalog_db',
      credentials:   rds.Credentials.fromSecret(catalogDbSecret),
      multiAz:       false,
      allocatedStorage:    20,
      maxAllocatedStorage: 50,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────
    // RDS — Orders DB (orders, order_items, shipping_addresses)
    // ─────────────────────────────────────────────────────────────────────
    const ordersDbSecret = new secretsmanager.Secret(this, 'OrdersDbSecret', {
      secretName: 'nimbuscart/orders-db',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'orders_user' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\ ',
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ordersDb = new rds.DatabaseInstance(this, 'OrdersDb', {
      instanceIdentifier: 'nimbuscart-orders',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets:    { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      databaseName:  'orders_db',
      credentials:   rds.Credentials.fromSecret(ordersDbSecret),
      multiAz:       false,
      allocatedStorage:    20,
      maxAllocatedStorage: 50,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────
    // ElastiCache Redis — cart service session store
    // Uses L1 construct (CDK L2 for ElastiCache not yet stable)
    // ─────────────────────────────────────────────────────────────────────
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description:          'NimbusCart Redis subnet group',
      subnetIds:            vpc.privateSubnets.map(s => s.subnetId),
      cacheSubnetGroupName: 'nimbuscart-redis-subnet',
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'Redis', {
      clusterName:        'nimbuscart-redis',
      cacheNodeType:      'cache.t3.micro',
      engine:             'redis',
      numCacheNodes:      1,
      vpcSecurityGroupIds: [redisSg.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });
    redisCluster.addDependency(redisSubnetGroup);

    // ─────────────────────────────────────────────────────────────────────
    // ECR Repositories — one per service
    // ─────────────────────────────────────────────────────────────────────
    const serviceNames = ['enterprise', 'catalog', 'cart', 'orders', 'checkout', 'ui'] as const;
    const ecrRepos: Record<string, ecr.Repository> = {};

    for (const svc of serviceNames) {
      ecrRepos[svc] = new ecr.Repository(this, `${capitalize(svc)}Repo`, {
        repositoryName: `nimbuscart-${svc}`,
        removalPolicy:  cdk.RemovalPolicy.DESTROY,
        emptyOnDelete:  true,
        lifecycleRules: [
          {
            maxImageCount: 5,
            description:   'Keep last 5 images',
          },
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ECS Cluster
    // ─────────────────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName:          'nimbuscart',
      vpc,
      containerInsights:    true,
    });

    // ─────────────────────────────────────────────────────────────────────
    // IAM — ECS task execution role (ECR pull + CloudWatch + Secrets Manager)
    // ─────────────────────────────────────────────────────────────────────
    const executionRole = new iam.Role(this, 'EcsExecutionRole', {
      roleName:    'nimbuscart-ecs-execution-role',
      assumedBy:   new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });
    executionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
      resources: [
        appSecrets.secretArn,
        enterpriseDbSecret.secretArn,
        catalogDbSecret.secretArn,
        ordersDbSecret.secretArn,
      ],
    }));

    // ─────────────────────────────────────────────────────────────────────
    // IAM — ECS task role (runtime permissions for tasks themselves)
    // ─────────────────────────────────────────────────────────────────────
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName:  'nimbuscart-ecs-task-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    // ─────────────────────────────────────────────────────────────────────
    // ALB — internet-facing, path-based routing to all 6 services
    // ─────────────────────────────────────────────────────────────────────
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      loadBalancerName: 'nimbuscart-alb',
      vpc,
      internetFacing:  true,
      securityGroup:   albSg,
      vpcSubnets:      { subnetType: ec2.SubnetType.PUBLIC },
    });

    // UI target group — default action on listener (catch-all for SPA routing)
    const uiTg = new elbv2.ApplicationTargetGroup(this, 'UiTg', {
      targetGroupName: 'nimbuscart-ui',
      vpc,
      protocol:        elbv2.ApplicationProtocol.HTTP,
      port:            80,
      targetType:      elbv2.TargetType.IP,
      healthCheck: {
        path:                    '/',
        interval:                cdk.Duration.seconds(30),
        healthyThresholdCount:   2,
        unhealthyThresholdCount: 3,
        timeout:                 cdk.Duration.seconds(10),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    const listener = alb.addListener('HttpListener', {
      port:          80,
      open:          true,
      defaultAction: elbv2.ListenerAction.forward([uiTg]),
    });

    // ─────────────────────────────────────────────────────────────────────
    // Shared ECS secrets (referenced in multiple task definitions)
    // ─────────────────────────────────────────────────────────────────────
    const secretJwt        = ecs.Secret.fromSecretsManager(appSecrets, 'JWT_SECRET');
    const secretSession    = ecs.Secret.fromSecretsManager(appSecrets, 'SESSION_SECRET');
    const secretGoogleId   = ecs.Secret.fromSecretsManager(appSecrets, 'GOOGLE_CLIENT_ID');
    const secretGoogleKey  = ecs.Secret.fromSecretsManager(appSecrets, 'GOOGLE_CLIENT_SECRET');

    // ALB base URL — used as API base in inter-service calls and OAuth redirect
    // albUrl context is set on 2nd deploy; on 1st deploy it uses the token (resolved at CF deploy)
    const apiBase = albUrl ?? `http://${alb.loadBalancerDnsName}`;

    // ─────────────────────────────────────────────────────────────────────
    // Helper — build a Fargate task + service from local Dockerfile
    // ─────────────────────────────────────────────────────────────────────
    const createFargateService = (opts: {
      name:         string;
      serviceDir:   string;
      port:         number;
      environment:  Record<string, string>;
      secrets?:     Record<string, ecs.Secret>;
      cpu?:         number;
      memory?:      number;
      buildArgs?:   Record<string, string>;
      command?:     string[];
    }): ecs.FargateService => {
      const logGroup = new logs.LogGroup(this, `${capitalize(opts.name)}Logs`, {
        logGroupName:    `/ecs/nimbuscart-${opts.name}`,
        retention:       logs.RetentionDays.ONE_WEEK,
        removalPolicy:   cdk.RemovalPolicy.DESTROY,
      });

      const taskDef = new ecs.FargateTaskDefinition(this, `${capitalize(opts.name)}TaskDef`, {
        family:          `nimbuscart-${opts.name}`,
        cpu:             opts.cpu    ?? 256,
        memoryLimitMiB:  opts.memory ?? 512,
        executionRole,
        taskRole,
      });

      const containerImage = opts.buildArgs
        ? ecs.ContainerImage.fromAsset(
            path.join(__dirname, '../../services', opts.serviceDir),
            { buildArgs: opts.buildArgs },
          )
        : ecs.ContainerImage.fromAsset(
            path.join(__dirname, '../../services', opts.serviceDir),
          );

      taskDef.addContainer(opts.name, {
        image:        containerImage,
        portMappings: [{ containerPort: opts.port }],
        environment:  opts.environment,
        secrets:      opts.secrets,
        command:      opts.command,
        logging:      ecs.LogDrivers.awsLogs({
          streamPrefix: opts.name,
          logGroup,
        }),
        healthCheck: {
          command:     ['CMD-SHELL', `curl -f http://localhost:${opts.port}/health || exit 1`],
          interval:    cdk.Duration.seconds(30),
          timeout:     cdk.Duration.seconds(5),
          retries:     3,
          startPeriod: cdk.Duration.seconds(90),
        },
      });

      return new ecs.FargateService(this, `${capitalize(opts.name)}Service`, {
        serviceName:    `nimbuscart-${opts.name}`,
        cluster,
        taskDefinition: taskDef,
        desiredCount:   1,
        vpcSubnets:     { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [ecsSg],
        assignPublicIp: false,
        circuitBreaker: { rollback: true },
      });
    };

    // ─────────────────────────────────────────────────────────────────────
    // Enterprise Service — Google OAuth, JWT issue, RBAC, enterprise APIs
    // Runs migrations on startup (002_add_role.sql adds role column)
    // ─────────────────────────────────────────────────────────────────────
    const enterpriseService = createFargateService({
      name:       'enterprise',
      serviceDir: 'enterprise',
      port:       3000,
      command:    ['sh', '-c', 'npm run migrate && npm start'],
      environment: {
        PORT:                 '3000',
        DB_HOST:              enterpriseDb.instanceEndpoint.hostname,
        DB_PORT:              '5432',
        DB_NAME:              'enterprise_db',
        DB_USER:              'enterprise_user',
        GOOGLE_CALLBACK_URL:  `${apiBase}/auth/google/callback`,
        FRONTEND_URL:         apiBase,
        NODE_ENV:             'production',
      },
      secrets: {
        DB_PASSWORD:          ecs.Secret.fromSecretsManager(enterpriseDbSecret, 'password'),
        JWT_SECRET:           secretJwt,
        SESSION_SECRET:       secretSession,
        GOOGLE_CLIENT_ID:     secretGoogleId,
        GOOGLE_CLIENT_SECRET: secretGoogleKey,
      },
    });

    // ─────────────────────────────────────────────────────────────────────
    // Catalog Service — product CRUD, tag management, RBAC write protection
    // Admin: POST/DELETE /products  |  All authenticated: GET /products
    // ─────────────────────────────────────────────────────────────────────
    const catalogService = createFargateService({
      name:       'catalog',
      serviceDir: 'catalog',
      port:       3001,
      command:    ['sh', '-c', 'npm run migrate && npm start'],
      environment: {
        PORT:     '3001',
        DB_HOST:  catalogDb.instanceEndpoint.hostname,
        DB_PORT:  '5432',
        DB_NAME:  'catalog_db',
        DB_USER:  'catalog_user',
        NODE_ENV: 'production',
      },
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(catalogDbSecret, 'password'),
        JWT_SECRET:  secretJwt,
      },
    });

    // ─────────────────────────────────────────────────────────────────────
    // Orders Service — order lifecycle, order items, shipping addresses
    // ─────────────────────────────────────────────────────────────────────
    const ordersService = createFargateService({
      name:       'orders',
      serviceDir: 'orders',
      port:       3004,
      command:    ['sh', '-c', 'npm run migrate && npm start'],
      environment: {
        PORT:     '3004',
        DB_HOST:  ordersDb.instanceEndpoint.hostname,
        DB_PORT:  '5432',
        DB_NAME:  'orders_db',
        DB_USER:  'orders_user',
        NODE_ENV: 'production',
      },
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(ordersDbSecret, 'password'),
        JWT_SECRET:  secretJwt,
      },
    });

    // ─────────────────────────────────────────────────────────────────────
    // Cart Service — Redis-backed cart with 7-day TTL per user
    // ─────────────────────────────────────────────────────────────────────
    const cartService = createFargateService({
      name:       'cart',
      serviceDir: 'cart',
      port:       3002,
      environment: {
        PORT:        '3002',
        REDIS_HOST:  redisCluster.attrRedisEndpointAddress,
        REDIS_PORT:  '6379',
        NODE_ENV:    'production',
      },
      secrets: {
        JWT_SECRET: secretJwt,
      },
    });

    // ─────────────────────────────────────────────────────────────────────
    // Checkout Service — orchestrates: fetch cart → create order → clear cart
    // Calls cart + orders via ALB path-based routing (inter-service over ALB)
    // ─────────────────────────────────────────────────────────────────────
    const checkoutService = createFargateService({
      name:       'checkout',
      serviceDir: 'checkout',
      port:       3003,
      environment: {
        PORT:               '3003',
        // checkout calls /cart/* and /orders/* — ALB routes to correct services
        CART_SERVICE_URL:   apiBase,
        ORDERS_SERVICE_URL: apiBase,
        NODE_ENV:           'production',
      },
      secrets: {
        JWT_SECRET: secretJwt,
      },
    });

    // ─────────────────────────────────────────────────────────────────────
    // UI Service — Vite build → nginx SPA
    // VITE_* vars are baked in at image build time (build args).
    // All 5 service URLs point to the same ALB — nginx serves the SPA,
    // ALB listener rules route API calls to the correct backend services.
    //
    // IMPORTANT: On 1st deploy albUrl is unknown so APIs use a placeholder.
    // After 1st deploy, get AlbUrl output and re-run:
    //   cdk deploy -c albUrl=http://<ALB_DNS> ...
    // ─────────────────────────────────────────────────────────────────────
    const uiApiBase = albUrl ?? 'http://REPLACE_WITH_ALB_URL_ON_SECOND_DEPLOY';

    const uiLogGroup = new logs.LogGroup(this, 'UiLogs', {
      logGroupName:  '/ecs/nimbuscart-ui',
      retention:     logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const uiTaskDef = new ecs.FargateTaskDefinition(this, 'UiTaskDef', {
      family:          'nimbuscart-ui',
      cpu:             256,
      memoryLimitMiB:  512,
      executionRole,
      taskRole,
    });

    uiTaskDef.addContainer('ui', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../../services/ui'),
        {
          buildArgs: {
            VITE_ENTERPRISE_URL: uiApiBase,
            VITE_CATALOG_URL:    uiApiBase,
            VITE_CART_URL:       uiApiBase,
            VITE_CHECKOUT_URL:   uiApiBase,
            VITE_ORDERS_URL:     uiApiBase,
          },
        },
      ),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ui',
        logGroup:     uiLogGroup,
      }),
      healthCheck: {
        command:     ['CMD-SHELL', 'curl -f http://localhost:80/ || exit 1'],
        interval:    cdk.Duration.seconds(30),
        timeout:     cdk.Duration.seconds(5),
        retries:     3,
        startPeriod: cdk.Duration.seconds(30),
      },
    });

    const uiService = new ecs.FargateService(this, 'UiService', {
      serviceName:    'nimbuscart-ui',
      cluster,
      taskDefinition: uiTaskDef,
      desiredCount:   1,
      vpcSubnets:     { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSg],
      assignPublicIp: false,
      circuitBreaker: { rollback: true },
    });

    // Attach UI service to default target group (created before listener above)
    uiService.attachToApplicationTargetGroup(uiTg);

    // ─────────────────────────────────────────────────────────────────────
    // ALB Listener Rules — path-based routing to backend services
    // UI is the default (catch-all) — all unmatched paths → SPA
    // ─────────────────────────────────────────────────────────────────────
    const addListenerRule = (
      name:         string,
      service:      ecs.FargateService,
      port:         number,
      pathPatterns: string[],
      priority:     number,
    ) => {
      const tg = new elbv2.ApplicationTargetGroup(this, `${capitalize(name)}Tg`, {
        targetGroupName: `nimbuscart-${name}`,
        vpc,
        protocol:        elbv2.ApplicationProtocol.HTTP,
        port,
        targetType:      elbv2.TargetType.IP,
        healthCheck: {
          path:                    '/health',
          interval:                cdk.Duration.seconds(30),
          healthyThresholdCount:   2,
          unhealthyThresholdCount: 3,
          timeout:                 cdk.Duration.seconds(10),
        },
        deregistrationDelay: cdk.Duration.seconds(30),
      });

      service.attachToApplicationTargetGroup(tg);

      listener.addAction(`${capitalize(name)}Rule`, {
        priority,
        conditions: [elbv2.ListenerCondition.pathPatterns(pathPatterns)],
        action:     elbv2.ListenerAction.forward([tg]),
      });
    };

    // Enterprise: OAuth routes + enterprise admin API (RBAC-protected)
    addListenerRule('enterprise', enterpriseService, 3000,
      ['/auth', '/auth/*', '/api/enterprise', '/api/enterprise/*'], 10);

    // Catalog: product listing + admin write endpoints (RBAC: POST/DELETE = admin only)
    addListenerRule('catalog', catalogService, 3001,
      ['/products', '/products/*'], 20);

    // Cart: Redis-backed cart per user
    addListenerRule('cart', cartService, 3002,
      ['/cart', '/cart/*'], 30);

    // Checkout: orchestrates cart → orders flow
    addListenerRule('checkout', checkoutService, 3003,
      ['/checkout', '/checkout/*'], 40);

    // Orders: order history + status tracking
    addListenerRule('orders', ordersService, 3004,
      ['/orders', '/orders/*'], 50);

    // ─────────────────────────────────────────────────────────────────────
    // CodePipeline + CodeBuild — optional, enabled when githubConnectionArn provided
    //
    // Prerequisites (manual, one-time in AWS Console):
    //   Settings → Connections → Create connection → GitHub → authorize
    //   Then pass the ARN as: -c githubConnectionArn=arn:aws:codestar-connections:...
    // ─────────────────────────────────────────────────────────────────────
    if (githubConnectionArn) {
      const artifactBucket = new s3.Bucket(this, 'PipelineArtifacts', {
        bucketName:     `nimbuscart-pipeline-artifacts-${this.account}`,
        removalPolicy:  cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption:     s3.BucketEncryption.S3_MANAGED,
      });

      const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
        roleName:  'nimbuscart-codebuild-role',
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        ],
      });
      codeBuildRole.addToPolicy(new iam.PolicyStatement({
        effect:    iam.Effect.ALLOW,
        actions:   ['s3:GetObject', 's3:PutObject', 's3:GetBucketVersioning'],
        resources: [artifactBucket.bucketArn, `${artifactBucket.bucketArn}/*`],
      }));

      const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
        projectName:  'nimbuscart-build',
        role:         codeBuildRole,
        environment: {
          buildImage:       codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged:       true, // required for docker build
          computeType:      codebuild.ComputeType.SMALL,
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
        environmentVariables: {
          AWS_ACCOUNT_ID:      { value: this.account },
          AWS_DEFAULT_REGION:  { value: this.region },
          FRONTEND_URL:        { value: apiBase },
          FRONTEND_URL_ENTERPRISE: { value: apiBase },
          FRONTEND_URL_CATALOG:    { value: apiBase },
          FRONTEND_URL_CART:       { value: apiBase },
          FRONTEND_URL_CHECKOUT:   { value: apiBase },
          FRONTEND_URL_ORDERS:     { value: apiBase },
          // Sensitive values pulled from Secrets Manager at build time
          GOOGLE_CLIENT_ID: {
            value: `${appSecrets.secretArn}:GOOGLE_CLIENT_ID`,
            type:  codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          },
          GOOGLE_CLIENT_SECRET: {
            value: `${appSecrets.secretArn}:GOOGLE_CLIENT_SECRET`,
            type:  codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          },
          JWT_SECRET: {
            value: `${appSecrets.secretArn}:JWT_SECRET`,
            type:  codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          },
          SESSION_SECRET: {
            value: `${appSecrets.secretArn}:SESSION_SECRET`,
            type:  codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          },
        },
        logging: {
          cloudWatch: {
            logGroup: new logs.LogGroup(this, 'CodeBuildLogs', {
              logGroupName:  '/codebuild/nimbuscart',
              retention:     logs.RetentionDays.ONE_WEEK,
              removalPolicy: cdk.RemovalPolicy.DESTROY,
            }),
          },
        },
      });

      const sourceOutput = new codepipeline.Artifact('SourceOutput');
      const buildOutput  = new codepipeline.Artifact('BuildOutput');

      new codepipeline.Pipeline(this, 'Pipeline', {
        pipelineName:     'nimbuscart-pipeline',
        artifactBucket,
        stages: [
          {
            stageName: 'Source',
            actions: [
              new codepipeline_actions.CodeStarConnectionsSourceAction({
                actionName:   'GitHub_Source',
                owner:        githubOwner,
                repo:         githubRepo,
                branch:       githubBranch,
                connectionArn: githubConnectionArn,
                output:       sourceOutput,
              }),
            ],
          },
          {
            stageName: 'Build',
            actions: [
              new codepipeline_actions.CodeBuildAction({
                actionName:  'Docker_Build_Push',
                project:     buildProject,
                input:       sourceOutput,
                outputs:     [buildOutput],
              }),
            ],
          },
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Stack Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'AlbUrl', {
      value:       `http://${alb.loadBalancerDnsName}`,
      description: 'NimbusCart application URL',
      exportName:  'NimbusCartAlbUrl',
    });

    new cdk.CfnOutput(this, 'AlbDns', {
      value:       alb.loadBalancerDnsName,
      exportName:  'NimbusCartAlbDns',
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value:       cluster.clusterName,
      exportName:  'NimbusCartCluster',
    });

    new cdk.CfnOutput(this, 'EnterpriseDbEndpoint', {
      value:       enterpriseDb.instanceEndpoint.hostname,
      exportName:  'NimbusCartEnterpriseDbHost',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value:       redisCluster.attrRedisEndpointAddress,
      exportName:  'NimbusCartRedisHost',
    });

    new cdk.CfnOutput(this, 'SecondDeployCommand', {
      value: [
        'npx cdk deploy',
        `-c albUrl=http://${alb.loadBalancerDnsName}`,
        '-c googleClientId=<YOUR_GOOGLE_CLIENT_ID>',
        '-c googleClientSecret=<YOUR_GOOGLE_CLIENT_SECRET>',
        '-c jwtSecret=<YOUR_JWT_SECRET>',
        '-c sessionSecret=<YOUR_SESSION_SECRET>',
      ].join(' \\\n  '),
      description: 'Run this after 1st deploy to rebuild UI with correct API base URL',
    });

    cdk.Tags.of(this).add('Project',     'NimbusCart');
    cdk.Tags.of(this).add('Environment', 'production');
    cdk.Tags.of(this).add('ManagedBy',   'CDK');
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

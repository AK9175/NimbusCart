# NimbusCart Implementation Prompt for Claude Code / Cursor

You are helping implement a class term project by extending an existing GitHub repository.

## Base Repository

**Repository URL:**  
https://github.com/aws-containers/retail-store-sample-app

Use **only this repository** as the starting point unless explicitly instructed otherwise.

Before making implementation decisions:

- inspect the actual repository contents
- confirm the real frontend/backend structure
- confirm the real build system and package manager
- confirm the real containerization and deployment assets
- confirm the real service names, paths, and commands

Do **not** assume file paths, frameworks, service names, Dockerfiles, Terraform files, or commands.

---

## Project Goal

Extend the base repository into a course project called **NimbusCart** with this scope:

1. cloud-based web portal
2. Google OAuth 2.0 login
3. Enterprise Data Viewer frontend
4. backend APIs for enterprise data
5. cloud-hosted relational database integration
6. containerized deployment compatibility
7. AWS-native CI/CD
8. documentation aligned with grading requirements

Do **not** implement chatbot integration now.  
Treat chatbot integration as **future scope only**.

---

## Project Framing

Frame the project as:

**NimbusCart: A Cloud-Native Retail and Enterprise Data Portal with Federated Authentication and AWS-Native CI/CD**

Use this mapping:

- **Google OAuth 2.0** instead of Okta
- **AWS CodePipeline + CodeBuild + ECR + ECS Fargate** instead of Jenkins
- **Enterprise Data Viewer** as the cloud web portal for enterprise-style data viewing
- **Amazon RDS PostgreSQL or MySQL** as the preferred cloud database for enterprise data
- **GitHub** as the main source repository
- **Chatbot integration** listed only under future scope

---

## Branding Requirement

Use the project name **NimbusCart** consistently across all user-facing and project-facing surfaces.

Apply **NimbusCart** to:

- frontend application title
- navbar / header branding
- login page
- dashboard and Enterprise Data Viewer page
- page titles / browser tab titles
- footer text if present
- README and docs
- architecture/deployment documentation
- environment examples where project name appears
- CI/CD artifact names where practical
- screenshots/demo labels where applicable

Rules:

- Replace or override the base sample app branding in all user-visible areas with **NimbusCart**.
- Do not leave mixed branding in frontend UI or documentation unless explicitly needed in a note like “based on …”.
- Internal package names, low-level service identifiers, or infrastructure resource names should only be renamed if safe and low-risk.
- Prioritize branding changes in UI text, page titles, visible app labels, docs, and artifacts.
- Avoid risky large-scale refactors just to rename internal code symbols.
- If keeping an internal identifier from the base repo is safer, keep it internally but ensure the visible product name is **NimbusCart**.

Expected result:

- frontend presents itself as **NimbusCart**
- project documentation refers to the system as **NimbusCart**
- submission-facing artifacts use the **NimbusCart** name consistently

---

## Hard Constraints

Follow these rules strictly:

- Do not hallucinate repository structure, file paths, service names, frameworks, or commands.
- Do not assume the repo uses React, Next.js, Node.js, JavaScript, Terraform, Docker Compose, ECS, or any other tool until verified.
- If a file, module, or directory does not exist, do not pretend it does.
- Inspect first, then modify based on facts.
- Prefer small, verifiable changes over broad rewrites.
- Preserve existing working functionality wherever possible.
- Reuse existing repo patterns and conventions where practical.
- Favor AWS-native managed services over self-hosted alternatives.
- Do not introduce Jenkins.
- Do not implement chatbot integration now.
- Keep the implementation practical for a student cloud project.
- If uncertain, choose the simplest implementation that satisfies the requirement cleanly.

---

## Primary Requirements

### A. Authentication

Implement **Google OAuth 2.0 login** for the web portal.

Minimum scope:

- login with Google
- authenticated session handling
- logout
- protected routes for enterprise-data pages
- unauthenticated users redirected to login

Requirements:

- use environment variables for credentials and configuration
- do not hardcode client IDs, secrets, callback URLs, or tokens
- choose the auth approach that best matches the actual repo architecture
- do not claim Okta support

---

### B. Enterprise Data Viewer Frontend

Add a frontend module/page called:

**Enterprise Data Viewer**

Minimum functionality:

- visible navigation entry or clear route access
- accessible only to authenticated users
- table or grid view of enterprise data
- search/filter controls
- pagination or reasonable list limiting
- loading state
- empty state
- error state

Target entities if feasible:

- products
- customers
- orders

If the base repo already includes product/order views, reuse patterns where appropriate, but still add a clearly named **Enterprise Data Viewer** page or module.

---

### C. Backend APIs for Enterprise Data

Add or adapt backend APIs to support the Enterprise Data Viewer.

Target endpoints:

- `GET /api/enterprise/products`
- `GET /api/enterprise/customers`
- `GET /api/enterprise/orders`
- `GET /api/enterprise/summary`

Requirements:

- do not duplicate existing logic unnecessarily
- reuse existing services where practical
- add an aggregation layer only if needed
- keep API responses clean and consistent
- add filtering/pagination only if practical and low-risk

If the repo already has overlapping APIs, document what was reused and what was added.

---

### D. Database Integration

Add a cloud-hostable relational database path for enterprise data.

Preferred target:

- **Amazon RDS PostgreSQL**, or
- **Amazon RDS MySQL**

Support at least these entities:

- customers
- products
- orders
- order_items

Requirements:

- define a minimal schema or mapping for these entities
- include a seed/sample data strategy
- support local development with environment variables
- avoid hardcoded credentials
- keep changes scoped to enterprise-data needs unless broader changes are clearly necessary

If the base app already uses another datastore for some services, do not rewrite the whole application unless required. Instead:

- add a clean enterprise-data datastore path
- keep the existing app working
- connect the new enterprise viewer/API flow to the relational database

---

### E. Containerization Compatibility

Ensure the updated application and any modified or added services can still be built as containers.

Tasks:

- inspect the existing container build workflow
- update Dockerfiles or build config only where needed
- verify frontend and enterprise-data related services can build successfully
- do not rewrite the container strategy unless necessary

---

### F. AWS Deployment Alignment

Prepare the codebase for deployment on:

- Amazon ECS Fargate
- Amazon ECR
- Application Load Balancer
- Amazon RDS

Requirements:

- reuse existing deployment patterns if present in the repo
- do not invent infrastructure files that do not exist
- document required environment variables
- document service dependencies
- document which services should be public vs private
- document any assumptions needed for deployment

---

### G. AWS-Native CI/CD

Implement or scaffold CI/CD using:

- GitHub
- AWS CodePipeline
- AWS CodeBuild
- Amazon ECR
- Amazon ECS

Provide at minimum:

- `buildspec.yml` or equivalent AWS CodeBuild instructions
- dependency install commands
- test/build steps
- container build steps
- ECR push steps
- ECS deployment handoff notes or artifacts

Do not introduce Jenkins.

Keep the CI/CD realistic and not overengineered.

---

### H. Documentation

Create or update documentation for:

- architecture summary
- authentication flow
- enterprise-data flow
- local setup instructions
- required environment variables
- deployment notes
- CI/CD notes
- future scope section

---

## Grading Priorities

Prioritize work in this order:

1. working cloud web portal
2. authentication
3. enterprise-data viewing
4. cloud relational database integration
5. GitHub-friendly repo structure and documentation
6. AWS-native CI/CD scaffolding
7. deployability on AWS
8. future scope documentation

If tradeoffs are necessary, prioritize:

- working authenticated web portal
- enterprise-data APIs
- database integration
- then CI/CD scaffolding
- then documentation polish

---

## Required Workflow

### Step 1: Repository Inspection

Before changing code, inspect the base repository and produce a factual summary of:

- frontend application location
- backend services and responsibilities
- languages and frameworks actually used
- workspace/build tooling
- package manager
- current containerization approach
- current deployment assets
- how local development is expected to run
- how services communicate
- what product/cart/order functionality already exists

Do not make code changes before this inspection summary is complete.

---

### Step 2: Concrete Change Plan

After inspection, produce a grounded implementation plan listing:

- files likely to change
- files likely to be added
- services affected
- database changes needed
- auth integration approach
- enterprise-data implementation approach
- CI/CD files to add or update
- risk areas
- minimum viable implementation path

Keep the plan tied to the actual repository structure.

---

### Step 3: Authentication Implementation

Implement Google OAuth 2.0 using the simplest approach that fits the actual repository architecture.

Requirements:

- environment-variable based configuration
- protected frontend route(s)
- logout
- authenticated session handling
- no hardcoded secrets
- minimal disruption to the existing codebase

Use only auth tooling that fits naturally with the verified framework structure.

---

### Step 4: Enterprise Data Viewer Frontend

Add the Enterprise Data Viewer page/module.

Requirements:

- clear route and/or navigation entry
- protected behind authentication
- search/filter controls
- readable table UI
- at least one summary section or simple stats block
- loading/error/empty states

Keep the UI simple, functional, and demo-friendly.

---

### Step 5: Enterprise Data APIs

Add or adapt enterprise-data APIs.

Requirements:

- clean response shapes
- reuse existing services if possible
- add aggregation only if necessary
- support products/customers/orders if feasible
- basic filtering/pagination only if practical

---

### Step 6: Database Layer

Add the relational schema, configuration, and seed strategy.

Requirements:

- clear schema or migration instructions
- local `.env`-based configuration
- clean data access approach consistent with repo conventions
- support enterprise viewer use cases
- do not break existing app behavior

---

### Step 7: Container Build Verification

Confirm that the modified application still supports container builds.

Requirements:

- verify updated services build cleanly
- adjust build config only where needed
- document any new build assumptions

---

### Step 8: AWS-Native CI/CD Scaffolding

Add CI/CD scaffolding.

Requirements:

- `buildspec.yml` or equivalent
- install/build/test instructions
- image build instructions
- ECR push instructions
- ECS deployment handoff notes
- document expected pipeline stages

---

### Step 9: Documentation Updates

Update or add documentation for:

- setup
- architecture
- authentication flow
- enterprise-data flow
- environment variables
- deployment assumptions
- CI/CD notes
- future scope

At every meaningful checkpoint, update the root-level `CONTEXT.md` file so another teammate or coding session can resume from the exact current state.

---

## CONTEXT.md Maintenance Requirement

Maintain a file named **`CONTEXT.md`** at the repository root throughout implementation.

Purpose:

- preserve current implementation state across teammates
- allow Claude Code / Cursor to resume work accurately from the latest checkpoint
- reduce duplicate work and confusion between sessions

### Rules

- Update `CONTEXT.md` at **every meaningful checkpoint**.
- A checkpoint includes any of the following:
  - repository inspection completed
  - implementation plan updated
  - authentication work started or completed
  - frontend work started or completed
  - backend API work started or completed
  - database changes made
  - container/build changes made
  - CI/CD changes made
  - documentation changes made
  - blockers discovered
  - scope changes or implementation decisions made

- Treat `CONTEXT.md` as the **handoff document** for the next teammate or coding session.
- Keep it concise, factual, and up to date.
- Do not write speculative or unverified statements in `CONTEXT.md`.
- If something is partially complete, clearly mark it as partial.
- If something was attempted and not completed, record:
  - what was attempted
  - what failed or remains unresolved
  - what the next person should do next

### Required Sections in CONTEXT.md

`CONTEXT.md` must always contain:

1. **Project**
   - project name
   - base repository
   - current branch if known

2. **Current Status**
   - short summary of current implementation state

3. **Completed Work**
   - completed features/tasks

4. **In Progress**
   - work currently underway

5. **Pending Next Steps**
   - immediate next tasks in priority order

6. **Files Added or Updated**
   - important files created or modified

7. **Implementation Decisions**
   - important confirmed technical choices

8. **Environment / Setup Notes**
   - required env vars
   - local run notes
   - build/dependency notes if relevant

9. **Blockers / Risks**
   - open issues, blockers, uncertainties, or handoff warnings

10. **Latest Checkpoint**
   - date/time if available
   - short note describing the last completed checkpoint

### Required Behavior

At the end of each meaningful implementation step:

- update `CONTEXT.md`
- make sure it reflects the latest real state of the repository
- ensure another teammate could read only `CONTEXT.md` and resume work with minimal confusion

Before starting new work in any later session:

- read `CONTEXT.md` first
- use it to understand current status
- verify its contents against the actual repository before making new changes

### Important Constraint

Do not let `CONTEXT.md` drift out of sync with the codebase.

It must remain a reliable handoff artifact for multi-person development across different Claude Code / Cursor sessions.

---

## Implementation Guidance

### Authentication Guidance

Use the simplest Google OAuth implementation that fits the actual repo.

Acceptable examples include:

- frontend OAuth + backend token verification
- Auth.js / NextAuth if the frontend is actually Next.js and that fits naturally
- Passport Google OAuth if that aligns with the backend/frontend architecture

Do not force a framework that conflicts with the verified repo structure.

---

### Enterprise Viewer Guidance

The Enterprise Data Viewer should feel like an enterprise portal, not just a storefront page.

Recommended content structure:

- page title: `Enterprise Data Viewer`
- summary cards or summary section
- selectable views or tabs if appropriate
- filters/search
- result table

Keep the implementation compact and practical.

---

### Data Scope Guidance

Keep the scope manageable.

Minimum useful entities:

- products
- customers
- orders

If customers do not already exist in the base app, create a minimal schema and seed data for them.

---

### Database Guidance

Prefer a relational schema for enterprise data even if parts of the base app use other database technologies.

Do not migrate the entire application to RDS unless clearly necessary.

---

### CI/CD Guidance

The CI/CD should be realistic and not overengineered.

Minimum acceptable output:

- `buildspec.yml`
- sample pipeline stage notes
- documented required AWS services
- documented ECR repo naming assumptions
- documented ECS deployment expectations

---

## Required Output Format While Working

While working, provide updates in this format:

1. **Repository Facts**
2. **Implementation Plan**
3. **Changes Made**
4. **Files Added/Updated**
5. **How to Run Locally**
6. **What Remains**
7. **Assumptions / Risks**

Keep all statements factual and grounded in the actual repository.

If unsure about a file, framework, or tool, inspect first and say so explicitly.

Also, at every meaningful checkpoint:

- update the root-level `CONTEXT.md`
- make sure it matches the current codebase state
- make it sufficient for the next teammate or session to resume work

---

## Files to Prefer Adding or Updating

Add or update files only if they fit repo conventions.

Possible files include:

- `README.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/future-scope.md`
- `CONTEXT.md`
- `.env.example`
- `buildspec.yml`
- migration or seed files
- frontend page/component files for enterprise data
- backend controller/service/repository files for enterprise APIs

Do not invent files unless they are actually useful and fit the repo structure.

---

## Future Scope

Do not implement chatbot integration now.

Add a short documentation section titled:

## Future Scope

Include only high-level future items such as:

- AI chatbot / conversational assistant
- order tracking through chatbot
- product recommendations through chatbot
- support escalation integration

Do not add chatbot code now.

---

## Definition of Done

The implementation is complete when the repository includes:

- a working Google-authenticated web portal path
- a visible and protected Enterprise Data Viewer page
- backend APIs for enterprise data
- relational database integration for enterprise data
- container build compatibility for modified components
- AWS-native CI/CD scaffolding
- clear local setup and deployment documentation
- `CONTEXT.md` updated with the latest accurate implementation state
- chatbot listed only as future scope

---

## Anti-Hallucination Rules

Do not:

- invent repo paths
- invent service names
- invent framework usage
- invent package manager usage
- invent Dockerfiles
- invent Terraform/CDK files
- invent database libraries
- invent API conventions
- invent commands

Always inspect first, then modify based on what is real.

If a requirement cannot be implemented cleanly in the current repo, explain:

- why
- the least disruptive alternative
- what code or documentation was added instead

---

## Expected End Result

A grounded, minimally risky extension of the base AWS sample app into **NimbusCart**, focused on:

- Google OAuth 2.0 authentication
- authenticated enterprise data portal functionality
- relational database support for enterprise data
- AWS-native CI/CD
- deployment readiness
- documentation suitable for a class project submission

Do not drift into unrelated features.  
Do not implement chatbot integration now.

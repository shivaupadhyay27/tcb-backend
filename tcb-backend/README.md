# TCB Backend — The Corporate Blog API

Production-grade blog backend built with Node.js, Express, TypeScript, Prisma, and NeonTech PostgreSQL.

## Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js LTS                         |
| Framework  | Express 4 + TypeScript 5            |
| ORM        | Prisma 5                            |
| Database   | NeonTech PostgreSQL                 |
| Auth       | JWT + Refresh Tokens + Google OAuth |
| Validation | Zod                                 |
| Images     | Cloudinary                          |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Run Prisma migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

## Project Structure

```
src/
├── auth/           # JWT, refresh tokens, Google OAuth, role middleware
├── lib/            # Prisma singleton
├── middleware/     # Error handler, notFound, Zod validate
├── posts/          # Post CRUD, slug generator, draft handling
└── seo/            # Meta builders, sitemap, robots.txt, noindex middleware
```

## API Routes

### Auth

| Method | Route                     | Auth   | Description                    |
| ------ | ------------------------- | ------ | ------------------------------ |
| POST   | `/api/v1/auth/register`   | Public | Register with email + password |
| POST   | `/api/v1/auth/login`      | Public | Login                          |
| POST   | `/api/v1/auth/refresh`    | Public | Rotate refresh token           |
| POST   | `/api/v1/auth/logout`     | Public | Revoke token                   |
| POST   | `/api/v1/auth/logout-all` | Bearer | Logout all devices             |
| GET    | `/api/v1/auth/google`     | Public | Google OAuth                   |

### Posts

| Method | Route                      | Auth   | Role    | Description          |
| ------ | -------------------------- | ------ | ------- | -------------------- |
| GET    | `/api/v1/posts`            | Public | —       | List published posts |
| GET    | `/api/v1/posts/:id`        | Public | —       | Get by ID            |
| GET    | `/api/v1/posts/slug/:slug` | Public | —       | Get by slug          |
| POST   | `/api/v1/posts`            | Bearer | WRITER+ | Create draft         |
| PUT    | `/api/v1/posts/:id`        | Bearer | WRITER+ | Update post          |
| DELETE | `/api/v1/posts/:id`        | Bearer | ADMIN   | Delete post          |

### SEO

| Route          | Description                          |
| -------------- | ------------------------------------ |
| `/robots.txt`  | Robots directives                    |
| `/sitemap.xml` | Dynamic XML sitemap (published only) |

## SEO Features

- X-Robots-Tag noindex on `/admin`, `/api`, `/auth`
- Canonical Link HTTP header on all public routes
- Dynamic sitemap — drafts never included
- Schema.org Article, BreadcrumbList, WebSite builders
- OpenGraph + Twitter Card meta builders

## Role Hierarchy

```
ADMIN > EDITOR > WRITER
```

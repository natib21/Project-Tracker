# Multi-Tenant Project Tracker

A take-home assessment project demonstrating a full-stack multi-tenant project tracker with authentication, organizations, and role-based access.

## Tech Stack

- **Backend**: NestJS + TypeScript + TypeORM + PostgreSQL
- **Frontend**: React + TypeScript + Vite + React Router
- **Deployment**: Docker + Docker Compose + GitHub Actions CI/CD

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (or use the Docker Compose setup)

### Local Development

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Start the database with Docker Compose:

```bash
docker-compose up -d postgres
```

4. Run database migrations:

```bash
npm run migration:run
```

5. Start the development servers:

In separate terminals:
```bash
npm run dev:api    # API server on http://localhost:3000
npm run dev:web    # Frontend dev server on http://localhost:5173
```

Or using Docker Compose for everything:
```bash
docker-compose up
```

### Testing

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- --name=MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Project Structure

```
.
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── .github/
│   └── workflows/
│       └── ci-cd.yml # GitHub Actions CI/CD
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

## Environment Variables

See `.env.example` for all required environment variables.

## Deployment

The project automatically deploys to Render on pushes to the `main` branch via GitHub Actions.

## License

MIT

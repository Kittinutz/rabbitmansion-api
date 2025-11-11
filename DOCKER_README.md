# Docker Setup Instructions

## Prerequisites

- Docker and Docker Compose installed
- Bun runtime (for local development)

## Environment Setup

1. Copy the environment variables template:

```bash
cp .env.example .env
```

2. Edit `.env` file with your preferred database credentials.

## Running with Docker

### Development

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f app
```

### Production

```bash
# Build optimized image
docker-compose -f docker-compose.yml up --build -d

# Check service health
docker-compose ps
```

## Individual Commands

```bash
# Build only the app image
docker build -t rabbitmansion-api .

# Run only PostgreSQL
docker-compose up postgres

# Stop all services
docker-compose down

# Remove volumes (careful - this deletes data!)
docker-compose down -v
```

## Accessing Services

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432
  - Database: `rabbitmansion` (or your configured name)
  - Username: `postgres` (or your configured username)
  - Password: `password` (or your configured password)

## Development

For local development without Docker:

```bash
# Install dependencies with Bun
bun install

# Start development server
bun run start:dev

# Build application
bun run build

# Run production build
bun run start:prod
```

## Docker Image Features

- **Multi-stage build** for optimized image size
- **Bun runtime** for fast JavaScript execution
- **Non-root user** for security
- **Health checks** for container monitoring
- **Production-optimized** with only necessary dependencies
- **Alpine Linux** base for minimal size

## Troubleshooting

1. **Port conflicts**: Change ports in `docker-compose.yml` if 3000 or 5432 are already in use
2. **Permission issues**: Ensure Docker has proper permissions
3. **Database connection**: Verify environment variables and network connectivity
4. **Build failures**: Check Dockerfile and ensure all dependencies are properly listed in `package.json`

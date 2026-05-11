# Backend API

Express + MongoDB API for the Team Task Manager.

## Setup

1. Create a MongoDB database (Atlas or local) and copy the connection string.
2. Configure environment variables in `backend/.env.local`:
	- `MONGODB_URI` (or `MongoDB_URI`)
	- `JWT_SECRET`
	- `JWT_EXPIRES_IN` (optional, defaults to 7d)
	- `CORS_ORIGIN`
3. Install dependencies and start the server:

```bash
npm install
npm run dev
```

## Core Endpoints

- `GET /health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:memberId`
- `DELETE /api/projects/:projectId/members/:memberId`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/dashboard`
- `POST /api/auth/register`
- `POST /api/auth/login`

All `/api/*` routes except `/api/auth/*` require a JWT bearer token.

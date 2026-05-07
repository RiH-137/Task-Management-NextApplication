# Backend API

Express + Supabase API for the Team Task Manager.

## Setup

1. Create a Supabase project and run [db/schema.sql](db/schema.sql) in the SQL editor.
2. Configure environment variables (see [.env.example](.env.example)).
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

All `/api/*` routes require a Clerk bearer token.

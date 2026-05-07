# Team Task Manager

Full-stack task management app with projects, assignments, and role-based access.

## Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Auth: Clerk (email + Google)
- Database: MongoDB

## Features

- Clerk authentication and session-based API access
- Project creation and team membership
- Task creation, assignment, status updates
- Role-based access (Admin, Member)
- Dashboard with task counts and overdue tracking

## Local setup

### 1) Backend

```bash
cd backend
```

Create `backend/.env.local` and set:

- `MONGODB_URI` (or `MongoDB_URI`)
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY` (optional if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set)
- `CORS_ORIGIN`

Start the API:

```bash
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL` to the backend base URL.

Start the app:

```bash
npm install
npm run dev
```

## Deployment (Railway)

1. Create two Railway services: `backend` and `frontend`.
2. Backend service:
	- Set environment variables from your `backend/.env.local`.
	- Deploy from the `backend` folder.
3. Frontend service:
	- Set environment variables from [frontend/.env.example](frontend/.env.example).
	- Set `NEXT_PUBLIC_API_URL` to the backend Railway URL.
	- Deploy from the `frontend` folder.
4. Clerk dashboard:
	- Add Railway URLs to allowed origins and redirect URLs.
	- Enable Google and email authentication providers.

## API overview

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

## Submission

- Live URL: <add-your-live-url>
- GitHub repo: <add-your-repo-url>

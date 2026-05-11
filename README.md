# Team Task Manager

Full-stack task management app with projects, assignments, and role-based access.

## Live link

- Frontend: <add-your-live-url>
- Backend: <add-your-backend-url>

## About

Team Task Manager is a lightweight project and task tracking system built for
small teams that want clear ownership, simple workflows, and fast visibility.
Admins create projects, assign work, and manage members. Members focus on their
assigned tasks and update progress through a simple status flow.

## Significance

- Keeps responsibilities clear with role-based access.
- Reduces project drift by tracking tasks, due dates, and overdue work.
- Provides quick operational visibility with a project-scoped dashboard.

## Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Auth: JWT (email + password)
- Database: MongoDB

## Features

- JWT authentication and session-based API access
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
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (optional, defaults to 7d)
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

## Deployment (Render + Vercel)

### Backend on Render

1. Create a new Web Service on Render.
2. Connect the repository and set the root directory to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
	- `MONGODB_URI`
	- `JWT_SECRET`
	- `JWT_EXPIRES_IN` (optional)
	- `CORS_ORIGIN` (set to your Vercel frontend URL)
6. Deploy and copy the Render service URL for the frontend.

### Frontend on Vercel

1. Import the repository into Vercel.
2. Set the root directory to `frontend`.
3. Add environment variable:
	- `NEXT_PUBLIC_API_URL` (your Render backend URL)
4. Deploy and copy the Vercel URL.

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
- `POST /api/tasks/:taskId/comments`
- `GET /api/dashboard`
- `GET /api/dashboard?projectId=:projectId`
- `GET /api/users/me`
- `POST /api/auth/register`
- `POST /api/auth/login`

All `/api/*` routes except `/api/auth/*` require a JWT bearer token.

## Submission

- Frontend URL: <add-your-live-url>
- Backend URL: <add-your-backend-url>
- GitHub repo: <add-your-repo-url>

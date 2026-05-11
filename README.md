# Team Task Manager

Full-stack task management app with projects, assignments, and role-based access.

## Live link

- Frontend URL: https://ttmng.netlify.app/
- Backend URL: https://task-management-nextapplication.onrender.com

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

Base URL (local): `http://localhost:4000`

Auth
- `POST /api/auth/register`
	- Body:
		```json
		{
			"name": "Rishi Ranjan",
			"email": "101rishidsr@gmail.com",
			"password": "ok@123456"
		}
		```
- `POST /api/auth/login`
	- Body:
		```json
		{
			"email": "101rishidsr@gmail.com",
			"password": "ok@123456"
		}
		```

Users
- `GET /api/users/me`

Projects
- `GET /api/projects`
- `POST /api/projects`
	- Body:
		```json
		{
			"name": "Website Redesign",
			"description": "Refresh the marketing site"
		}
		```
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
	- Body (any fields):
		```json
		{
			"name": "Website Redesign",
			"description": "Updated scope"
		}
		```
- `DELETE /api/projects/:projectId`

Project members
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
	- Body:
		```json
		{
			"email": "100bytehacker@gmail.com",
			"role": "member"
		}
		```
- `PATCH /api/projects/:projectId/members/:memberId`
	- Body:
		```json
		{
			"role": "admin"
		}
		```
- `DELETE /api/projects/:projectId/members/:memberId`

Tasks
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
	- Body:
		```json
		{
			"title": "Create wireframes",
			"description": "Homepage + pricing",
			"status": "todo",
			"priority": "medium",
			"dueDate": "2026-06-15",
			"assignedTo": "64f2cfe1a3b24d7d1b9b4e11"
		}
		```
- `PATCH /api/tasks/:taskId`
	- Body (any fields):
		```json
		{
			"status": "in_progress"
		}
		```
- `POST /api/tasks/:taskId/comments`
	- Body:
		```json
		{
			"message": "Draft is ready for review."
		}
		```
- `DELETE /api/tasks/:taskId`

Dashboard
- `GET /api/dashboard`
	- Optional query: `?projectId=<projectId>`

Health
- `GET /health`

All `/api/*` routes except `/api/auth/*` require a JWT bearer token.

Header for protected routes:

```
Authorization: Bearer <token>
```

## Submission

- Frontend URL: https://ttmng.netlify.app/
- Backend URL: https://task-management-nextapplication.onrender.com
- GitHub repo: https://github.com/RiH-137/Task-Management-NextApplication

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const STATUS_OPTIONS = ["todo", "in_progress", "blocked", "done"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const ROLE_OPTIONS = ["admin", "member"];

const emptyStats = {
  total: 0,
  status: {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  },
  overdue: 0,
};

export default function DashboardClient() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [stats, setStats] = useState(emptyStats);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    status: "todo",
    priority: "medium",
    assignedTo: "",
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member",
  });
  const [commentInputs, setCommentInputs] = useState({});

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null;
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Request failed");
      }

      return payload.data ?? payload;
    },
    [getToken]
  );

  const loadDashboard = useCallback(async () => {
    const data = await apiFetch("/api/dashboard");
    setStats(data || emptyStats);
  }, [apiFetch]);

  const loadProjects = useCallback(async () => {
    const data = await apiFetch("/api/projects");
    setProjects(data || []);
    setActiveProjectId((current) => current || data?.[0]?.id || "");
  }, [apiFetch]);

  const loadProjectDetails = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTasks([]);
        setMembers([]);
        return;
      }

      const [projectData, tasksData] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`),
        apiFetch(`/api/projects/${projectId}/tasks`),
      ]);

      setMembers(projectData?.members || []);
      setTasks(tasksData || []);
    },
    [apiFetch]
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([loadDashboard(), loadProjects()])
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadDashboard, loadProjects]);

  useEffect(() => {
    loadProjectDetails(activeProjectId).catch((error) => {
      setNotice(error.message);
    });
  }, [activeProjectId, loadProjectDetails]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const currentMember = useMemo(() => {
    if (!user?.id) return null;
    return (
      members.find((member) => member.user?.clerk_id === user.id) || null
    );
  }, [members, user?.id]);

  const isAdmin = activeProject?.role === "admin";
  const currentUserId = currentMember?.user?.id || "";

  const membersById = useMemo(() => {
    const lookup = new Map();
    members.forEach((member) => {
      if (member.user?.id) {
        lookup.set(member.user.id, member.user);
      }
    });
    return lookup;
  }, [members]);

  const assignableMembers = useMemo(() => {
    if (isAdmin) return members;
    if (!currentUserId) return [];
    return members.filter((member) => member.user?.id === currentUserId);
  }, [currentUserId, isAdmin, members]);

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!projectForm.name.trim()) {
      setNotice("Project name is required.");
      return;
    }

    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
      };
      const project = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setProjects((prev) => [project, ...prev]);
      setActiveProjectId(project.id);
      setProjectForm({ name: "", description: "" });
      setNotice("Project created.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!activeProjectId) {
      setNotice("Select a project first.");
      return;
    }

    if (!taskForm.title.trim()) {
      setNotice("Task title is required.");
      return;
    }

    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        dueDate: taskForm.dueDate || null,
        status: taskForm.status,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo || null,
      };

      const task = await apiFetch(`/api/projects/${activeProjectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((prev) => [task, ...prev]);
      setTaskForm({
        title: "",
        description: "",
        dueDate: "",
        status: "todo",
        priority: "medium",
        assignedTo: "",
      });
      setNotice("Task added.");
      loadDashboard();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      const updated = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task))
      );
      loadDashboard();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleAddComment = async (taskId) => {
    const message = (commentInputs[taskId] || "").trim();
    if (!message) return;

    try {
      const updated = await apiFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task))
      );
      setCommentInputs((prev) => ({ ...prev, [taskId]: "" }));
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!activeProjectId) {
      setNotice("Select a project first.");
      return;
    }

    if (!inviteForm.email.trim()) {
      setNotice("Email is required.");
      return;
    }

    try {
      const payload = {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      };

      const member = await apiFetch(`/api/projects/${activeProjectId}/members`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMembers((prev) => [...prev, member]);
      setInviteForm({ email: "", role: "member" });
      setNotice("Member added. They must sign in at least once.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Workspace
          </p>
          <h1 className="font-display text-3xl text-zinc-900 sm:text-4xl">
            {user?.firstName ? `Welcome back, ${user.firstName}.` : "Welcome back."}
          </h1>
          <p className="text-sm text-zinc-600">
            Keep an eye on what is due, what is blocked, and what is next.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {activeProject?.name || "No active project"}
          </div>
          {activeProject?.role && (
            <div className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">
              {activeProject.role}
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700 shadow-sm">
          {notice}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "My tasks", value: stats.total },
          { label: "In progress", value: stats.status?.in_progress || 0 },
          { label: "Blocked", value: stats.status?.blocked || 0 },
          { label: "Overdue", value: stats.overdue },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {loading ? "-" : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-zinc-900">Projects</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                {projects.length} total
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {projects.length === 0 && (
                <p className="text-sm text-zinc-500">Create your first project.</p>
              )}
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setActiveProjectId(project.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    project.id === activeProjectId
                      ? "border-zinc-900 bg-zinc-900 text-zinc-50"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p
                      className={`text-xs ${
                        project.id === activeProjectId
                          ? "text-zinc-300"
                          : "text-zinc-500"
                      }`}
                    >
                      {project.description || "No description"}
                    </p>
                  </div>
                  <span className="rounded-full border border-current px-3 py-1 text-xs uppercase tracking-[0.2em]">
                    {project.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <h3 className="font-display text-xl text-zinc-900">New project</h3>
            <form className="mt-4 space-y-3" onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="Project name"
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <textarea
                rows={3}
                placeholder="Short description"
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800"
              >
                Create project
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-zinc-900">Tasks</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                {tasks.length} items
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {tasks.length === 0 && (
                <p className="text-sm text-zinc-500">No tasks yet.</p>
              )}
              {tasks.map((task) => {
                const assignee = task.assigned_to
                  ? membersById.get(task.assigned_to)
                  : null;
                const isOverdue =
                  task.due_date && task.due_date < today && task.status !== "done";
                const comments = task.comments || [];
                const commentValue = commentInputs[task.id] || "";

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {task.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {assignee?.name || "Unassigned"} |{" "}
                          {task.priority}
                        </p>
                      </div>
                      <select
                        value={task.status}
                        onChange={(event) =>
                          handleStatusChange(task.id, event.target.value)
                        }
                        className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>
                        Due: {task.due_date ? task.due_date : "No date"}
                      </span>
                      {isOverdue && (
                        <span className="rounded-full border border-zinc-400 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Comments
                      </p>
                      <div className="mt-2 space-y-2">
                        {comments.length === 0 && (
                          <p className="text-xs text-zinc-500">
                            No comments yet.
                          </p>
                        )}
                        {comments.map((comment, index) => (
                          <div
                            key={comment.id || `${task.id}-comment-${index}`}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-800">
                                {comment.author_name || "Member"}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                                {comment.created_at
                                  ? new Date(comment.created_at).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-600">
                              {comment.message}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <textarea
                          rows={2}
                          placeholder="Write a comment..."
                          value={commentValue}
                          onChange={(event) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [task.id]: event.target.value,
                            }))
                          }
                          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(task.id)}
                          disabled={!commentValue.trim()}
                          className="rounded-2xl bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <h3 className="font-display text-xl text-zinc-900">New task</h3>
            <form className="mt-4 space-y-3" onSubmit={handleCreateTask}>
              <input
                type="text"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <textarea
                rows={3}
                placeholder="Task details"
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                />
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      priority: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.assignedTo}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      assignedTo: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {assignableMembers.map((member) => (
                    <option key={member.id} value={member.user?.id || ""}>
                      {member.user?.name || member.user?.email || "Member"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800"
              >
                Add task
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-zinc-900">Team</h3>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                {members.length} members
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {member.user?.name || member.user?.email || "Member"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {member.user?.email || "No email on file"}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
                    {member.role}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-zinc-500">Invite teammates to join.</p>
              )}
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-5">
              <h4 className="text-sm font-semibold text-zinc-800">
                Invite member
              </h4>
              <p className="text-xs text-zinc-500">
                Use the email tied to their Clerk account.
              </p>
              <form className="mt-3 space-y-3" onSubmit={handleInviteMember}>
                <input
                  type="email"
                  placeholder="member@company.com"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
                />
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                  disabled={!isAdmin}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  disabled={!isAdmin}
                >
                  Add member
                </button>
                {!isAdmin && (
                  <p className="text-xs text-zinc-500">
                    Only admins can invite new members.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

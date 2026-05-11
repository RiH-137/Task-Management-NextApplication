"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const STATUS_OPTIONS = ["todo", "in_progress", "done"];
const TASK_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "To do", value: "todo" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "done" },
  { label: "Overdue", value: "overdue" },
];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const ROLE_OPTIONS = ["admin", "member"];

const emptyStats = {
  total: 0,
  status: {
    todo: 0,
    in_progress: 0,
    done: 0,
  },
  overdue: 0,
  tasks_per_user: [],
};

export default function DashboardClient({ initialProjectId = "" }) {
  const { token, signOut } = useAuth();
  const router = useRouter();
  const routeProjectId = initialProjectId || "";

  const [stats, setStats] = useState(emptyStats);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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
  const [editTaskId, setEditTaskId] = useState("");
  const [editTaskForm, setEditTaskForm] = useState({
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      if (!token) {
        throw new Error("Please sign in to continue.");
      }

      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null;
      }

      if (response.status === 401) {
        signOut();
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Request failed");
      }

      return payload.data ?? payload;
    },
    [token, signOut]
  );

  const loadDashboard = useCallback(
    async (projectId) => {
      const query = projectId ? `?projectId=${projectId}` : "";
      const data = await apiFetch(`/api/dashboard${query}`);
      setStats(data || emptyStats);
    },
    [apiFetch]
  );

  const loadProjects = useCallback(async () => {
    const data = await apiFetch("/api/projects");
    setProjects(data || []);

    const hasRouteMatch = routeProjectId
      ? data?.some((project) => project.id === routeProjectId)
      : false;

    setActiveProjectId((current) => {
      if (routeProjectId && hasRouteMatch) {
        return routeProjectId;
      }

      return current || data?.[0]?.id || "";
    });

    if (routeProjectId && !hasRouteMatch) {
      const fallbackId = data?.[0]?.id || "";
      if (fallbackId) {
        router.replace(`/projects/${fallbackId}`);
      } else {
        router.replace("/projects");
      }
    }
  }, [apiFetch, routeProjectId, router]);

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

    if (!token) {
      setCurrentUser(null);
      setAuthReady(true);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setAuthReady(false);
    apiFetch("/api/users/me")
      .then((data) => {
        if (isMounted) {
          setCurrentUser(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAuthReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, apiFetch]);

  useEffect(() => {
    if (!token) {
      setStats(emptyStats);
      setProjects([]);
      setActiveProjectId("");
      setTasks([]);
      setMembers([]);
      setNotice("");
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    if (!token || !authReady || !currentUser) {
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);

    Promise.all([loadProjects()])
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
  }, [token, authReady, currentUser, loadProjects]);

  useEffect(() => {
    if (!routeProjectId) {
      return;
    }

    setActiveProjectId((current) =>
      current === routeProjectId ? current : routeProjectId
    );
  }, [routeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    if (routeProjectId === activeProjectId) {
      return;
    }

    router.push(`/projects/${activeProjectId}`);
  }, [activeProjectId, routeProjectId, router]);

  useEffect(() => {
    if (!token || !authReady || !currentUser) {
      return;
    }

    loadDashboard(activeProjectId).catch((error) => {
      setNotice(error.message);
    });
  }, [token, authReady, currentUser, activeProjectId, loadDashboard]);

  useEffect(() => {
    if (!token || !authReady || !currentUser) {
      return;
    }

    loadProjectDetails(activeProjectId).catch((error) => {
      setNotice(error.message);
    });
  }, [token, authReady, currentUser, activeProjectId, loadProjectDetails]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const currentMember = useMemo(() => {
    if (!currentUser?.id) return null;
    return members.find((member) => member.user?.id === currentUser.id) || null;
  }, [members, currentUser?.id]);

  const isAdmin = activeProject?.role === "admin";
  const currentUserId = currentMember?.user?.id || currentUser?.id || "";

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

  const today = new Date().toISOString().slice(0, 10);

  const isTaskOverdue = (task) =>
    task.due_date && task.due_date < today && task.status !== "done";

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") {
      return tasks;
    }

    return tasks.filter((task) => {
      const overdue = isTaskOverdue(task);
      if (statusFilter === "overdue") {
        return overdue;
      }
      if (overdue) {
        return false;
      }
      return task.status === statusFilter;
    });
  }, [tasks, statusFilter, today, isTaskOverdue]);

  const overdueTasksPerUser = useMemo(() => {
    const counts = new Map();

    tasks.forEach((task) => {
      if (!isTaskOverdue(task)) return;
      if (!task.assigned_to) return;
      counts.set(task.assigned_to, (counts.get(task.assigned_to) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([userId, total]) => ({
        user: membersById.get(userId) || { id: userId },
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks, membersById, today, isTaskOverdue]);

  const tasksPerUser = stats.tasks_per_user || [];

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

    if (!isAdmin) {
      setNotice("Only admins can create tasks.");
      return;
    }

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
      loadDashboard(activeProjectId);
      setShowNewTaskModal(false);
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
      loadDashboard(activeProjectId);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const startEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTaskForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.due_date || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assignedTo: task.assigned_to || "",
    });
  };

  const cancelEditTask = () => {
    setEditTaskId("");
    setEditTaskForm({
      title: "",
      description: "",
      dueDate: "",
      status: "todo",
      priority: "medium",
      assignedTo: "",
    });
  };

  const handleUpdateTask = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!editTaskId) {
      return;
    }

    if (!editTaskForm.title.trim()) {
      setNotice("Task title is required.");
      return;
    }

    try {
      const payload = {
        title: editTaskForm.title.trim(),
        description: editTaskForm.description.trim() || null,
        dueDate: editTaskForm.dueDate || null,
        status: editTaskForm.status,
        priority: editTaskForm.priority,
        assignedTo: editTaskForm.assignedTo || null,
      };

      const updated = await apiFetch(`/api/tasks/${editTaskId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setTasks((prev) =>
        prev.map((task) => (task.id === editTaskId ? updated : task))
      );
      setNotice("Task updated.");
      cancelEditTask();
      loadDashboard(activeProjectId);
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

  const handleRemoveMember = async (memberId) => {
    setNotice("");

    if (!activeProjectId) {
      setNotice("Select a project first.");
      return;
    }

    try {
      await apiFetch(`/api/projects/${activeProjectId}/members/${memberId}`, {
        method: "DELETE",
      });

      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setNotice("Member removed.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const summaryCards = [
    { label: isAdmin ? "Total tasks" : "My tasks", value: stats.total },
    { label: "To do", value: stats.status?.todo || 0 },
    { label: "In progress", value: stats.status?.in_progress || 0 },
    { label: "Done", value: stats.status?.done || 0 },
    { label: "Overdue", value: stats.overdue },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Workspace
          </p>
          <h1 className="font-display text-3xl text-zinc-900 sm:text-4xl">
            {currentUser?.name
              ? `Welcome back, ${currentUser.name}.`
              : "Welcome back."}
          </h1>
          <p className="text-sm text-zinc-600">
            Keep an eye on what is due, what is in progress, and what is next.
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
        {summaryCards.map((item) => (
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

          {activeProjectId && (
            <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-zinc-900">
                  Tasks per user
                </h3>
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {tasksPerUser.length} assignees
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {tasksPerUser.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No assigned tasks yet.
                  </p>
                )}
                {tasksPerUser.map((entry, index) => (
                  <div
                    key={entry.user?.id || entry.user?.email || index}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {entry.user?.name || entry.user?.email || "Member"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {entry.user?.email || "No email on file"}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
                      {entry.total} tasks
                    </span>
                  </div>
                ))}
              </div>
              {!isAdmin && tasksPerUser.length > 0 && (
                <p className="mt-4 text-xs text-zinc-500">
                  Showing your assigned tasks only.
                </p>
              )}
            </div>
          )}

          {activeProjectId && (
            <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-zinc-900">
                  Overdue tasks per user
                </h3>
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {overdueTasksPerUser.length} assignees
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {overdueTasksPerUser.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No overdue tasks yet.
                  </p>
                )}
                {overdueTasksPerUser.map((entry, index) => (
                  <div
                    key={entry.user?.id || entry.user?.email || index}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {entry.user?.name || entry.user?.email || "Member"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {entry.user?.email || "No email on file"}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
                      {entry.total} overdue
                    </span>
                  </div>
                ))}
              </div>
              {!isAdmin && overdueTasksPerUser.length > 0 && (
                <p className="mt-4 text-xs text-zinc-500">
                  Showing your assigned tasks only.
                </p>
              )}
            </div>
          )}

        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-zinc-900">Tasks</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {filteredTasks.length} of {tasks.length} items
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-lg font-semibold text-zinc-900 transition hover:border-zinc-500"
                  aria-label="Create new task"
                  title="Create new task"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TASK_FILTER_OPTIONS.map((option) => {
                const isActive = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-zinc-50"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 space-y-3">
              {tasks.length === 0 && (
                <p className="text-sm text-zinc-500">No tasks yet.</p>
              )}
              {tasks.length > 0 && filteredTasks.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No tasks match this filter.
                </p>
              )}
              {filteredTasks.map((task) => {
                const assignee = task.assigned_to
                  ? membersById.get(task.assigned_to)
                  : null;
                const isOverdue = isTaskOverdue(task);
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
                      <div className="flex items-center gap-2">
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
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              editTaskId === task.id
                                ? cancelEditTask()
                                : startEditTask(task)
                            }
                            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-500"
                          >
                            {editTaskId === task.id ? "Cancel" : "Edit"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>
                        End date: {task.due_date ? task.due_date : "No date"}
                      </span>
                      {isOverdue && (
                        <span className="rounded-full border border-zinc-400 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                          Overdue
                        </span>
                      )}
                    </div>
                    {isAdmin && editTaskId === task.id && (
                      <form
                        className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                        onSubmit={handleUpdateTask}
                      >
                        <input
                          type="text"
                          placeholder="Task title"
                          value={editTaskForm.title}
                          onChange={(event) =>
                            setEditTaskForm((prev) => ({
                              ...prev,
                              title: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
                        />
                        <textarea
                          rows={3}
                          placeholder="Task details"
                          value={editTaskForm.description}
                          onChange={(event) =>
                            setEditTaskForm((prev) => ({
                              ...prev,
                              description: event.target.value,
                            }))
                          }
                          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                              End date
                            </p>
                            <input
                              type="date"
                              value={editTaskForm.dueDate}
                              onChange={(event) =>
                                setEditTaskForm((prev) => ({
                                  ...prev,
                                  dueDate: event.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                            />
                          </div>
                          <select
                            value={editTaskForm.priority}
                            onChange={(event) =>
                              setEditTaskForm((prev) => ({
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
                            value={editTaskForm.status}
                            onChange={(event) =>
                              setEditTaskForm((prev) => ({
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
                            value={editTaskForm.assignedTo}
                            onChange={(event) =>
                              setEditTaskForm((prev) => ({
                                ...prev,
                                assignedTo: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.user?.id || ""}>
                                {member.user?.name || member.user?.email || "Member"}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="rounded-2xl bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-50 shadow-sm transition hover:bg-zinc-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditTask}
                            className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
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
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
                      {member.role}
                    </span>
                    {isAdmin && member.user?.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-red-700 transition hover:border-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
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
                Use the email tied to their account.
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

      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/60"
            onClick={() => setShowNewTaskModal(false)}
            aria-label="Close new task popup"
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-zinc-900">New task</h3>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-500"
              >
                Close
              </button>
            </div>
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
                disabled={!isAdmin}
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
                disabled={!isAdmin}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    End date
                  </p>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) =>
                      setTaskForm((prev) => ({
                        ...prev,
                        dueDate: event.target.value,
                      }))
                    }
                    disabled={!isAdmin}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      priority: event.target.value,
                    }))
                  }
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
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
                disabled={!isAdmin}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Add task
              </button>
              {!isAdmin && (
                <p className="text-xs text-zinc-500">
                  Only admins can create tasks.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

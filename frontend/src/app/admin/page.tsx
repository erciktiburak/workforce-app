"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [online, setOnline] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [openCreateTask, setOpenCreateTask] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalAssignedTo, setModalAssignedTo] = useState("");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "ADMIN") {
          router.push("/employee");
        }
      } catch {
        router.push("/login");
      }
    };

    checkRole();
  }, [router]);

  useEffect(() => {
    api.get("/work/admin/dashboard/").then((res) => {
      setDashboard(res.data);
    });
    api.get("/users/").then((res) => setUsers(res.data)).catch(() => setUsers([]));
    api.get("/work/tasks/all/").then((res) => {
      setTasks(res.data);
    });
    api.get("/work/admin/weekly-stats/").then((res) => {
      const formatted = res.data.map((item: any) => ({
        date: item.date,
        hours: (item.seconds / 3600).toFixed(2),
      }));
      setWeekly(formatted);
    });
  }, []);

  useEffect(() => {
    api.get("/online-users/").then((res) => setOnline(res.data)).catch(() => setOnline([]));

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/presence/");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.status === "online") {
        setOnline((prev) => {
          const exists = prev.find((u) => u.id === msg.user_id);
          if (exists) return prev;
          return [...prev, { id: msg.user_id, username: msg.username, status: "online" }];
        });
      }
    };

    const snapshotInterval = setInterval(() => {
      api.get("/online-users/").then((res) => setOnline(res.data)).catch(() => {});
    }, 30000);

    return () => {
      ws.close();
      clearInterval(snapshotInterval);
    };
  }, []);
  
  const createEmployee = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Username and password required");
      return;
    }
    try {
      await api.post("/users/create/", {
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
      });
      toast.success("Employee created");
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      api.get("/users/").then((res) => setUsers(res.data));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create employee");
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email required");
      return;
    }
    try {
      const res = await api.post("/invites/create/", { email: inviteEmail.trim() });
      toast.success("Invite created");
      setInviteLink(res.data.invite_link);
      setInviteEmail("");
      if (typeof console !== "undefined") console.log(res.data.invite_link);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create invite");
    }
  };

  const createTaskFromModal = async () => {
    if (!modalAssignedTo) {
      toast.error("Please select a user");
      return;
    }
    try {
      await api.post("/work/tasks/create/", {
        title: modalTitle,
        description: modalDescription || undefined,
        assigned_to: Number(modalAssignedTo),
      });
      const res = await api.get("/work/tasks/all/");
      setTasks(res.data);
      setOpenCreateTask(false);
      setModalTitle("");
      setModalDescription("");
      setModalAssignedTo("");
      toast.success("Task created");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Failed to create task");
    }
  };

  if (!dashboard) return <DashboardLayout title="Admin Dashboard"><div>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout
      title="Admin Dashboard"
      sidebarExtra={
        <button
          type="button"
          onClick={() => setOpenCreateTask(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition w-full"
        >
          + Create Task
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Users" value={dashboard.total_users} />
        <StatCard title="Active Sessions" value={dashboard.active_sessions} />
        <StatCard
          title="Today Work Hours"
          value={(dashboard.today_total_work_seconds / 3600).toFixed(2)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Team Activity</h2>
        {online.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">No team members</div>
        )}
        <div className="space-y-3">
          {online.map((u) => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
                    {u.username?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800
                      ${u.status === "online" || u.status === "working" ? "bg-green-500" : u.status === "idle" || u.status === "break" ? "bg-yellow-400" : "bg-red-500"}
                    `}
                  />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{u.username}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {String(u.status || "offline").toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">All Tasks</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="font-medium text-gray-800 dark:text-white">{task.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Status: {task.status} | Assigned To: {task.assigned_to}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Invite Employee</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 flex-1 min-w-[180px] rounded"
            placeholder="Employee Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            onClick={sendInvite}
          >
            Send Invite
          </button>
        </div>
        {inviteLink && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Invite link: </span>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded break-all text-gray-800 dark:text-gray-200">
              {inviteLink}
            </code>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mt-6 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">Create Employee</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            type="password"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            onClick={createEmployee}
          >
            Create
          </button>
        </div>
      </div>

      <div className="mb-4 mt-6">
        <Link className="underline text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" href="/admin/policy">
          Manage Work Policy
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mt-8 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">Weekly Work Hours</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {openCreateTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setOpenCreateTask(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Create Task</h2>
            <input
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded mb-3"
              placeholder="Title"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
            />
            <textarea
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded mb-3 min-h-[80px]"
              placeholder="Description"
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
            />
            <select
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded mb-4"
              value={modalAssignedTo}
              onChange={(e) => setModalAssignedTo(e.target.value)}
            >
              <option value="">Select user</option>
              {users.filter((u) => u.role === "EMPLOYEE").map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                onClick={createTaskFromModal}
              >
                Create
              </button>
              <button
                type="button"
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 transition"
                onClick={() => setOpenCreateTask(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

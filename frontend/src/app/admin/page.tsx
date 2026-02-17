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
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [weekly, setWeekly] = useState<any[]>([]);
  const [online, setOnline] = useState<any[]>([]);

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
  
    const interval = setInterval(() => {
      api.get("/online-users/")
        .then((res) => setOnline(res.data))
        .catch(() => setOnline([])); // 403 when not admin — hide online list
    }, 10000);
  
    return () => clearInterval(interval);
  
  }, []);
  
  const createTask = async () => {
    try {
      await api.post("/work/tasks/create/", {
        title,
        assigned_to: Number(assignedTo),
      });
  
      const res = await api.get("/work/tasks/all/");
      setTasks(res.data);
  
      setTitle("");
      setAssignedTo("");
      toast.success("Task created successfully");
  
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create task");
    }
  };
   

  if (!dashboard) return <DashboardLayout title="Admin Dashboard"><div>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Users" value={dashboard.total_users} />
        <StatCard title="Active Sessions" value={dashboard.active_sessions} />
        <StatCard
          title="Today Work Hours"
          value={(dashboard.today_total_work_seconds / 3600).toFixed(2)}
        />
      </div>

      <div className="bg-white shadow rounded p-4 mt-6">
        <h2 className="text-lg mb-4 font-medium">Online Users</h2>

        {online.length === 0 && (
          <div className="text-gray-500">No active users</div>
        )}

        <div className="space-y-2">
          {online.map((u) => (
            <div
              key={u.id}
              className="flex justify-between items-center border-b pb-2"
            >
              <span>{u.username}</span>
              <span className="text-green-500 text-sm">● Online</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg mb-4 font-medium">Create Task</h2>
        <div className="flex gap-2">
          <input
            className="border p-2 flex-1 rounded"
            placeholder="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border p-2 w-32 rounded"
            placeholder="User ID"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={createTask}
          >
            Create
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg mb-4 font-medium">All Tasks</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="border rounded p-3">
              <div className="font-medium">{task.title}</div>
              <div className="text-sm text-gray-500">
                Status: {task.status} | Assigned To: {task.assigned_to}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Link className="underline text-blue-400 hover:text-blue-600" href="/admin/policy">
          Manage Work Policy
        </Link>
      </div>

      <div className="bg-white shadow rounded p-4 mt-8">
        <h2 className="text-lg mb-4 font-medium">Weekly Work Hours</h2>
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
    </DashboardLayout>
  );
}

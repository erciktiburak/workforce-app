"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

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
  
    } catch (err: any) {
      alert(JSON.stringify(err.response?.data));
    }
  };
   

  if (!dashboard) return <DashboardLayout title="Admin Dashboard"><div>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="mt-6">
        <h2 className="text-lg mb-2">Online Users</h2>
        {online.length === 0 && <div>No active users</div>}
        {online.map((u) => (
          <div key={u.id} className="border p-2 mb-1">
            {u.username}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div>Total Users: {dashboard.total_users}</div>
        <div>Active Sessions: {dashboard.active_sessions}</div>
        <div>
          Today Work Hours: {(dashboard.today_total_work_seconds / 3600).toFixed(2)}
        </div>
      </div>

      <div className="border p-4 mb-6">
        <h2 className="text-lg mb-2">Create Task</h2>
        <input
          className="border p-2 mr-2"
          placeholder="Task Title"
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 mr-2"
          placeholder="Assign User ID"
          onChange={(e) => setAssignedTo(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white p-2"
          onClick={createTask}
        >
          Create
        </button>
      </div>

      <div>
        <h2 className="text-lg mb-2">All Tasks</h2>
        {tasks.map((task) => (
          <div key={task.id} className="border p-2 mb-2">
            <div><strong>{task.title}</strong></div>
            <div>Status: {task.status}</div>
            <div>Assigned To: {task.assigned_to}</div>
          </div>
        ))}
      </div>

      <div className="mb-4">
          <Link className="underline text-blue-400" href="/admin/policy">
          Manage Work Policy
          </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-lg mb-4">Weekly Work Hours</h2>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}

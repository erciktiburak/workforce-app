"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    api.get("/work/admin/dashboard/").then((res) => {
      setDashboard(res.data);
    });

    api.get("/work/tasks/all/").then((res) => {
      setTasks(res.data);
    });
  }, []);

  const createTask = async () => {
    await api.post("/work/tasks/create/", {
      title,
      assigned_to: assignedTo,
    });
    alert("Task created");
    location.reload();
  };

  if (!dashboard) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Admin Dashboard</h1>

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
    </div>
  );
}

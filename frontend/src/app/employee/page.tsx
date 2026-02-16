"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api.get("/work/tasks/my/").then((res) => {
      setTasks(res.data);
    });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/work/tasks/${id}/status/`, {
      status,
    });
    location.reload();
  };

  const startWork = async () => {
    await api.post("/work/start/");
    alert("Work started");
  };

  const stopWork = async () => {
    await api.post("/work/stop/");
    alert("Work stopped");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Employee Panel</h1>

      <div className="mb-6">
        <button className="bg-green-500 text-white p-2 mr-2" onClick={startWork}>
          Start Work
        </button>
        <button className="bg-red-500 text-white p-2" onClick={stopWork}>
          Stop Work
        </button>
      </div>

      <div>
        <h2 className="text-lg mb-2">My Tasks</h2>
        {tasks.map((task) => (
          <div key={task.id} className="border p-2 mb-2">
            <div><strong>{task.title}</strong></div>
            <div>Status: {task.status}</div>

            {task.status !== "DONE" && (
              <>
                <button
                  className="bg-yellow-500 text-white p-1 mr-2"
                  onClick={() => updateStatus(task.id, "DOING")}
                >
                  Start
                </button>
                <button
                  className="bg-blue-500 text-white p-1"
                  onClick={() => updateStatus(task.id, "DONE")}
                >
                  Complete
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

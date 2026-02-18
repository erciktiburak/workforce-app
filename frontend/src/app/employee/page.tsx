"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

export default function EmployeeDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [onBreak, setOnBreak] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "EMPLOYEE") {
          router.push("/admin");
        }
      } catch {
        router.push("/login");
      }
    };

    checkRole();
  }, [router]);

  useEffect(() => {
    api.get("/work/tasks/my/").then((res) => {
      setTasks(res.data);
    });
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/presence/");
    ws.onopen = () => {
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 20000);
      (ws as unknown as { _interval?: ReturnType<typeof setInterval> })._interval = interval;
    };
    ws.onclose = () => {
      const interval = (ws as unknown as { _interval?: ReturnType<typeof setInterval> })._interval;
      if (interval) clearInterval(interval);
    };
    return () => {
      ws.close();
    };
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/work/tasks/${id}/status/`, {
        status,
      });
      toast.success("Task status updated");
      location.reload();
    } catch (err: any) {
      toast.error("Failed to update task status");
    }
  };

  const startWork = async () => {
    try {
      await api.post("/work/start/");
      toast.success("Work started");
    } catch (err: any) {
      toast.error("Failed to start work");
    }
  };

  const stopWork = async () => {
    try {
      await api.post("/work/stop/");
      toast.success("Work stopped");
    } catch (err: any) {
      toast.error("Failed to stop work");
    }
  };

  const startBreak = async () => {
    try {
      await api.post("/work/break/session/start/");
      setOnBreak(true);
      toast.success("Break started");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start break");
    }
  };

  const endBreak = async () => {
    try {
      await api.post("/work/break/session/end/");
      setOnBreak(false);
      toast.success("Break ended");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to end break");
    }
  };

  return (
    <DashboardLayout title="Employee Panel">
      <div className="mb-6 flex flex-wrap gap-2">
        <button 
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition" 
          onClick={startWork}
        >
          Start Work
        </button>
        <button 
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" 
          onClick={stopWork}
        >
          Stop Work
        </button>
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
          onClick={startBreak}
        >
          Break
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={endBreak}
        >
          Resume
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">My Tasks</h2>

        {tasks.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">No tasks assigned</div>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-3">
            <div className="font-medium text-gray-800 dark:text-white">{task.title}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Status: {task.status}
            </div>

            {task.status !== "DONE" && (
              <div className="flex gap-2">
                <button
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                  onClick={() => updateStatus(task.id, "DOING")}
                >
                  Start
                </button>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  onClick={() => updateStatus(task.id, "DONE")}
                >
                  Complete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

export default function EmployeeDashboard() {
  const router = useRouter();
  
  // State Machine States
  const [working, setWorking] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  
  // Chronometer States
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  
  // Other States
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any>(null);

  // Role check
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

  // Load initial session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await api.get("/work/live-session/");
        if (res.data.active) {
          setWorking(true);
          setOnBreak(res.data.on_break);
          setWorkSeconds(res.data.work_seconds);
          setBreakSeconds(res.data.break_seconds);
        } else {
          setWorking(false);
          setOnBreak(false);
          setWorkSeconds(0);
          setBreakSeconds(0);
        }
      } catch (err) {
        setWorking(false);
        setOnBreak(false);
        setWorkSeconds(0);
        setBreakSeconds(0);
      }
    };

    loadSession();
    
    // Load tasks and daily stats
    api.get("/work/tasks/my/").then((res) => {
      setTasks(res.data);
    }).catch(() => {});
    
    api.get("/work/my-daily-stats/").then((res) => {
      setDailyStats(res.data);
    }).catch(() => {});
  }, []);

  // WebSocket presence
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

  // Real-time Chronometer Engine
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (working && !onBreak) {
      // Work time is counting
      interval = setInterval(() => {
        setWorkSeconds((prev) => prev + 1);
      }, 1000);
    } else if (working && onBreak) {
      // Break time is counting
      interval = setInterval(() => {
        setBreakSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [working, onBreak]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Format seconds as hours and minutes
  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Actions
  const startWork = async () => {
    try {
      await api.post("/work/start/");
      setWorking(true);
      setOnBreak(false);
      setWorkSeconds(0);
      setBreakSeconds(0);
      toast.success("Work started");
      
      // Refresh daily stats
      api.get("/work/my-daily-stats/").then((res) => {
        setDailyStats(res.data);
      }).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start work");
    }
  };

  const stopWork = async () => {
    try {
      await api.post("/work/stop/");
      setWorking(false);
      setOnBreak(false);
      // workSeconds ve breakSeconds'u sıfırlama - geçmiş silinmesin
      toast.success("Work stopped");
      
      // Refresh daily stats
      api.get("/work/my-daily-stats/").then((res) => {
        setDailyStats(res.data);
      }).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to stop work");
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

  const resumeWork = async () => {
    try {
      await api.post("/work/break/session/end/");
      setOnBreak(false);
      toast.success("Resumed work");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to resume work");
    }
  };

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

  return (
    <DashboardLayout title="Employee Panel" role="EMPLOYEE">
      {/* Today's Work Summary */}
      {dailyStats && (
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
          <h2 className="text-lg mb-2 font-medium text-gray-800 dark:text-white">Today's Work</h2>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatSeconds(dailyStats.today_seconds)}
          </div>
        </div>
      )}

      {/* Real-time Chronometer */}
      {working && (
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 shadow-lg rounded-xl p-8 transition-colors">
          <div className="text-center">
            <div className="text-sm text-blue-100 dark:text-blue-200 mb-2 uppercase tracking-wide">
              {onBreak ? "On Break" : "Working"}
            </div>
            <div className="text-5xl font-bold text-white mb-4 font-mono">
              {onBreak ? formatTime(breakSeconds) : formatTime(workSeconds)}
            </div>
            <div className="flex justify-center gap-6 text-sm text-blue-100 dark:text-blue-200">
              <div>
                <div className="text-xs opacity-75">Work Time</div>
                <div className="font-semibold">{formatTime(workSeconds)}</div>
              </div>
              <div>
                <div className="text-xs opacity-75">Break Time</div>
                <div className="font-semibold">{formatTime(breakSeconds)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Machine Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {!working && (
          <button
            onClick={startWork}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold shadow-md"
          >
            Start Work
          </button>
        )}

        {working && !onBreak && (
          <button
            onClick={startBreak}
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition font-semibold shadow-md"
          >
            Break
          </button>
        )}

        {working && onBreak && (
          <button
            onClick={resumeWork}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold shadow-md"
          >
            Resume
          </button>
        )}

        {working && (
          <button
            onClick={stopWork}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition font-semibold shadow-md"
          >
            Stop Work
          </button>
        )}
      </div>

      {/* Tasks Section */}
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

      {/* Timeline Visualization */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors mt-6">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">Today's Timeline</h2>
        <TimelineVisualization />
      </div>

      {/* Monthly Report Download */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors mt-6">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">Monthly Report</h2>
        <button
          onClick={() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            window.open(`http://127.0.0.1:8000/api/work/reports/me/monthly-pdf/?year=${year}&month=${month}`, "_blank");
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Download Monthly PDF
        </button>
      </div>
    </DashboardLayout>
  );
}

// Timeline Component
function TimelineVisualization() {
  const [timelineData, setTimelineData] = useState<any[]>([]);

  useEffect(() => {
    const loadTimeline = () => {
      api.get("/work/my-today-timeline/").then((res) => {
        setTimelineData(res.data);
      }).catch(() => {});
    };

    loadTimeline();
    const interval = setInterval(loadTimeline, 3000);
    return () => clearInterval(interval);
  }, []);

  if (timelineData.length === 0) {
    return <div className="text-gray-500 dark:text-gray-400">No sessions today</div>;
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-2">
      {timelineData.map((session, idx) => {
        const start = new Date(session.start);
        const end = session.end ? new Date(session.end) : new Date();
        const duration = (end.getTime() - start.getTime()) / 1000 / 60; // minutes
        const breakMinutes = session.break_seconds / 60;
        const workMinutes = duration - breakMinutes;

        return (
          <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-blue-100 dark:bg-blue-900 rounded h-6 relative overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(workMinutes / duration) * 100}%` }}
                />
                {breakMinutes > 0 && (
                  <div
                    className="bg-yellow-400 h-full absolute top-0"
                    style={{
                      left: `${(workMinutes / duration) * 100}%`,
                      width: `${(breakMinutes / duration) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(session.start)} - {session.end ? formatTime(session.end) : "Ongoing"} | 
              Work: {Math.floor(workMinutes)}m | Break: {Math.floor(breakMinutes)}m
            </div>
          </div>
        );
      })}
    </div>
  );
}

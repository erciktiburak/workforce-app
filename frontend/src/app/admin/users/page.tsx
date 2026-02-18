"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type UserDetail = {
  id: number;
  username: string;
  status: string;
  start_time: string | null;
  current_task: { id: number; title: string; status: string } | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "ADMIN") {
          router.push("/employee");
          return;
        }
        const res = await api.get("/users/detailed/");
        setUsers(res.data);
      } catch {
        router.push("/login");
      }
    };
    run();
  }, [router]);

  const statusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-green-500";
      case "break":
        return "bg-yellow-400";
      case "idle":
        return "bg-yellow-300";
      default:
        return "bg-red-500";
    }
  };

  const formatHms = (seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const openUser = async (user: UserDetail) => {
    setSelectedUser(user);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/work/analytics/admin/user/${user.id}/`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedUser(null);
    setDetail(null);
    setDetailLoading(false);
  };

  return (
    <DashboardLayout title="Users" role="ADMIN">
      <Link
        href="/admin"
        className="inline-block mb-6 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
      >
        ← Back to Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Team</h2>
        <div className="space-y-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-4 last:border-0 cursor-pointer"
              onClick={() => openUser(u)}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-gray-200">
                    {u.username?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${statusColor(u.status)}`}
                  />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{u.username}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {u.status}
                  </div>
                  {u.start_time && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Started: {new Date(u.start_time).toLocaleString()}
                    </div>
                  )}
                  {u.current_task && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Task: {u.current_task.title} ({u.current_task.status})
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  openUser(u);
                }}
              >
                Open Panel
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={closeDrawer}>
          <div
            className="w-96 max-w-[90vw] h-full bg-white dark:bg-gray-800 p-6 shadow-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {detail?.username ?? selectedUser.username}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  Status: {detail?.status ?? selectedUser.status}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>

            {detailLoading && (
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            )}

            {!detailLoading && detail && (
              <>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Today
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <div>
                        <span className="font-semibold">Start:</span>{" "}
                        {detail.today?.start_time ? new Date(detail.today.start_time).toLocaleTimeString() : "-"}
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold">Net:</span>{" "}
                        {formatHms(detail.today?.net_seconds ?? 0)}
                      </div>
                      <div>
                        <span className="font-semibold">Break:</span>{" "}
                        {formatHms(detail.today?.break_seconds ?? 0)}
                      </div>
                      <div>
                        <span className="font-semibold">Total:</span>{" "}
                        {formatHms(detail.today?.total_seconds ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Active Task
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      {detail.active_task?.title ?? "-"}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Task Completion
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      {detail.tasks?.done ?? 0} / {detail.tasks?.total ?? 0} DONE
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Rate: {detail.tasks?.completion_rate ?? 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-medium text-gray-800 dark:text-white mb-2">
                    Weekly Net Hours
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={detail.weekly || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

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
              className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-4 last:border-0"
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
              <Link
                href={`/admin/users/${u.id}`}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

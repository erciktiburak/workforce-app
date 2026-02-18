"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

type UserDetailData = {
  username: string;
  status: string;
  current_start_time: string | null;
  today_work_seconds: number;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id;
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "ADMIN") {
          router.push("/employee");
          return;
        }
        const res = await api.get(`/users/${userId}/`);
        setUserDetail(res.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          router.push("/admin/users");
        } else {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router, userId]);

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

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <DashboardLayout title="User Details" role="ADMIN">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!userDetail) {
    return (
      <DashboardLayout title="User Details" role="ADMIN">
        <div className="text-red-500">User not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Details" role="ADMIN">
      <Link
        href="/admin/users"
        className="inline-block mb-6 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
      >
        ← Back to Users
      </Link>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200">
              {userDetail.username?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${statusColor(userDetail.status)}`}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {userDetail.username}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              Status: {userDetail.status}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {userDetail.current_start_time && (
            <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Current Session Started
              </div>
              <div className="text-lg font-medium text-gray-800 dark:text-white">
                {new Date(userDetail.current_start_time).toLocaleString()}
              </div>
            </div>
          )}

          <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Today's Work Duration
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatSeconds(userDetail.today_work_seconds)}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

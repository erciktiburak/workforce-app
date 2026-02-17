"use client";

import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const router = useRouter();

  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch {}
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <button
          onClick={logout}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Logout
        </button>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

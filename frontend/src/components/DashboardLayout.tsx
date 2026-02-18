"use client";

import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
  title,
  sidebarExtra,
}: {
  children: React.ReactNode;
  title: string;
  sidebarExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [me, setMe] = useState<{ organization?: string } | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved === "dark") setDark(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", dark ? "dark" : "light");
    }
  }, [dark]);

  useEffect(() => {
    api.get("/me/").then((res) => setMe(res.data)).catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch {}
    router.push("/login");
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md p-5 flex flex-col">
          <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
            Workforce
          </h2>

          <nav className="flex flex-col gap-3 text-gray-700 dark:text-gray-200">
            <Link href="/admin" className="hover:text-blue-500 dark:hover:text-blue-400 transition">
              Dashboard
            </Link>
            <Link href="/admin/users" className="hover:text-blue-500 dark:hover:text-blue-400 transition">
              Users
            </Link>
            <Link href="/admin/policy" className="hover:text-blue-500 dark:hover:text-blue-400 transition">
              Policy
            </Link>
          </nav>

          {sidebarExtra && <div className="mt-4">{sidebarExtra}</div>}

          <div className="mt-8">
            <button
              onClick={() => setDark(!dark)}
              className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Toggle Dark Mode
            </button>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded w-full hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
            {title}
          </h1>
          {me?.organization && (
            <div className="text-sm text-gray-500 dark:text-gray-300 mb-4">
              Organization: {me.organization}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

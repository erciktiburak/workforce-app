"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const accept = async () => {
    try {
      await api.post(`/invites/accept/${token}/`, {
        username,
        password,
      });
      toast.success("Account created");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl w-80">
        <h1 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Complete Your Account
        </h1>

        <input
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full mb-2 rounded"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full mb-4 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={accept}
          className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700 transition"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "ADMIN") {
          router.push("/employee");
        }
      } catch {
        router.push("/login");
      }
    };

    checkRole();
    api.get("/users/").then((res) => setUsers(res.data)).catch(() => setUsers([]));
  }, [router]);

  const createEmployee = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Username and password required");
      return;
    }
    try {
      await api.post("/users/create/", {
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
      });
      toast.success("Employee created");
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      api.get("/users/").then((res) => setUsers(res.data));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create employee");
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email required");
      return;
    }
    try {
      const res = await api.post("/invites/create/", { email: inviteEmail.trim() });
      toast.success("Invite created");
      setInviteLink(res.data.invite_link);
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create invite");
    }
  };

  return (
    <DashboardLayout title="Manage Employees" role="ADMIN">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">Create Employee</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
            placeholder="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            onClick={createEmployee}
          >
            Create Employee
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Invite Employee</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 flex-1 min-w-[180px] rounded"
            placeholder="Employee Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            onClick={sendInvite}
          >
            Send Invite
          </button>
        </div>
        {inviteLink && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Invite link: </span>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded break-all text-gray-800 dark:text-gray-200">
              {inviteLink}
            </code>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
        <h2 className="text-lg mb-4 font-medium text-gray-800 dark:text-white">All Employees</h2>
        <div className="space-y-2">
          {users.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400">No employees</div>
          )}
          {users.map((user) => (
            <div key={user.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="font-medium text-gray-800 dark:text-white">{user.username}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {user.email} | Role: {user.role}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

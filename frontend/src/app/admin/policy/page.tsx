"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

type Policy = {
  daily_work_minutes: number;
  daily_break_minutes: number;
  break_mode: "FLEXIBLE" | "FIXED";
  fixed_break_start: string | null;
  fixed_break_end: string | null;
};

export default function AdminPolicyPage() {
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/me/");
        if (me.data.role !== "ADMIN") {
          router.push("/employee");
          return;
        }
        const res = await api.get("/work/policy/");
        setPolicy(res.data);
      } catch (e) {
        router.push("/login");
      }
    })();
  }, [router]);

  const save = async () => {
    if (!policy) return;
    try {
      setSaving(true);
      await api.put("/work/policy/update/", policy);
      toast.success("Policy updated");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!policy) return <DashboardLayout title="Work Policy"><div className="p-6">Loading...</div></DashboardLayout>;

  const fixedDisabled = policy.break_mode !== "FIXED";

  return (
    <DashboardLayout title="Work Policy">
      <button
        onClick={() => router.push("/admin")}
        className="mb-6 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
      >
        ← Back to Dashboard
      </button>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 max-w-xl transition-colors space-y-4">
        <div>
          <label className="block mb-1 text-gray-800 dark:text-white">Daily work minutes</label>
          <input
            type="number"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded"
            value={policy.daily_work_minutes}
            onChange={(e) =>
              setPolicy({ ...policy, daily_work_minutes: Number(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-800 dark:text-white">Daily break minutes</label>
          <input
            type="number"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded"
            value={policy.daily_break_minutes}
            onChange={(e) =>
              setPolicy({ ...policy, daily_break_minutes: Number(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-800 dark:text-white">Break mode</label>
          <select
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded"
            value={policy.break_mode}
            onChange={(e) =>
              setPolicy({ ...policy, break_mode: e.target.value as Policy["break_mode"] })
            }
          >
            <option value="FLEXIBLE">Flexible</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-gray-800 dark:text-white">Fixed break start (HH:MM)</label>
          <input
            type="time"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded disabled:opacity-50"
            disabled={fixedDisabled}
            value={policy.fixed_break_start ?? ""}
            onChange={(e) =>
              setPolicy({ ...policy, fixed_break_start: e.target.value || null })
            }
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-800 dark:text-white">Fixed break end (HH:MM)</label>
          <input
            type="time"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 w-full rounded disabled:opacity-50"
            disabled={fixedDisabled}
            value={policy.fixed_break_end ?? ""}
            onChange={(e) =>
              setPolicy({ ...policy, fixed_break_end: e.target.value || null })
            }
          />
        </div>

        <button
          className="bg-blue-600 text-white p-2 w-full rounded disabled:opacity-50 hover:bg-blue-700 transition"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Policy"}
        </button>
      </div>
    </DashboardLayout>
  );
}

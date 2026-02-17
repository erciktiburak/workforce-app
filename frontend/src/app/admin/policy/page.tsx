"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

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
      alert("Policy updated");
    } catch (err: any) {
      console.error(err.response?.data);
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!policy) return <div className="p-6">Loading...</div>;

  const fixedDisabled = policy.break_mode !== "FIXED";

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl mb-4">Work Policy</h1>

      <div className="border rounded p-4 space-y-4">
        <div>
          <label className="block mb-1">Daily work minutes</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={policy.daily_work_minutes}
            onChange={(e) =>
              setPolicy({ ...policy, daily_work_minutes: Number(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="block mb-1">Daily break minutes</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={policy.daily_break_minutes}
            onChange={(e) =>
              setPolicy({ ...policy, daily_break_minutes: Number(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="block mb-1">Break mode</label>
          <select
            className="border p-2 w-full"
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
          <label className="block mb-1">Fixed break start (HH:MM)</label>
          <input
            type="time"
            className="border p-2 w-full"
            disabled={fixedDisabled}
            value={policy.fixed_break_start ?? ""}
            onChange={(e) =>
              setPolicy({ ...policy, fixed_break_start: e.target.value || null })
            }
          />
        </div>

        <div>
          <label className="block mb-1">Fixed break end (HH:MM)</label>
          <input
            type="time"
            className="border p-2 w-full"
            disabled={fixedDisabled}
            value={policy.fixed_break_end ?? ""}
            onChange={(e) =>
              setPolicy({ ...policy, fixed_break_end: e.target.value || null })
            }
          />
        </div>

        <button
          className="bg-blue-600 text-white p-2 w-full disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Policy"}
        </button>
      </div>
    </div>
  );
}

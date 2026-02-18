"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type AuditLog = {
  id: number;
  created_at: string;
  actor: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  metadata: any;
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
  }, [router]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const url = actionFilter
          ? `/audit/logs/?limit=50&action=${actionFilter}`
          : "/audit/logs/?limit=50";
        const res = await api.get(url);
        setLogs(res.data);
      } catch (err) {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [actionFilter]);

  const actionTypes = [
    "TASK_CREATED",
    "TASK_STATUS_CHANGED",
    "WORK_STARTED",
    "WORK_STOPPED",
    "BREAK_STARTED",
    "BREAK_ENDED",
  ];

  return (
    <DashboardLayout title="Audit Logs" role="ADMIN">
      <div className="mb-6 flex items-center gap-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
        >
          <option value="">All Actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Audit Logs</h2>

        {loading && <div className="text-gray-500 dark:text-gray-400">Loading...</div>}

        {!loading && logs.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">No logs found</div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-white">
                      {log.action}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {log.actor || "System"} • {log.entity_type}
                      {log.entity_id && ` #${log.entity_id}`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString()}
                      {log.ip_address && ` • ${log.ip_address}`}
                    </div>
                  </div>
                  {Object.keys(log.metadata || {}).length > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">View Details</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-xl w-96 max-w-[90vw] shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Audit Log Details
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Action:</span>{" "}
                <span className="text-gray-800 dark:text-white">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Actor:</span>{" "}
                <span className="text-gray-800 dark:text-white">{selectedLog.actor || "System"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Entity:</span>{" "}
                <span className="text-gray-800 dark:text-white">
                  {selectedLog.entity_type}
                  {selectedLog.entity_id && ` #${selectedLog.entity_id}`}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Time:</span>{" "}
                <span className="text-gray-800 dark:text-white">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
              {selectedLog.ip_address && (
                <div>
                  <span className="font-semibold text-gray-600 dark:text-gray-400">IP:</span>{" "}
                  <span className="text-gray-800 dark:text-white">{selectedLog.ip_address}</span>
                </div>
              )}
              {Object.keys(selectedLog.metadata || {}).length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Metadata:</div>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="mt-6 w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

from django.urls import path
from .views import (
    start_work, stop_work, break_start, break_end,
    session_break_start, session_break_end,
    policy_view, update_policy, admin_dashboard, weekly_stats,
    create_task, my_tasks, all_tasks, update_task_status,
)
urlpatterns = [
    path("start/", start_work),
    path("stop/", stop_work),
    path("break/start/", break_start),
    path("break/end/", break_end),
    path("break/session/start/", session_break_start),
    path("break/session/end/", session_break_end),
    path("policy/", policy_view),
    path("policy/update/", update_policy),
    path("admin/dashboard/", admin_dashboard),
    path("admin/weekly-stats/", weekly_stats),
    path("tasks/create/", create_task),
    path("tasks/my/", my_tasks),
    path("tasks/all/", all_tasks),
    path("tasks/<int:task_id>/status/", update_task_status),
]

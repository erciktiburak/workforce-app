from django.urls import path
from .views import start_work, stop_work, break_start, break_end, policy_view, update_policy, admin_dashboard, weekly_stats
urlpatterns = [
    path("start/", start_work),
    path("stop/", stop_work),
    path("break/start/", break_start),
    path("break/end/", break_end),
    path("policy/", policy_view),
    path("policy/update/", update_policy),
    path("admin/dashboard/", admin_dashboard),
    path("admin/weekly-stats/", weekly_stats),

]

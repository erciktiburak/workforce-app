from django.urls import path
from .views import start_work, stop_work, break_start, break_end

urlpatterns = [
    path("start/", start_work),
    path("stop/", stop_work),
    path("break/start/", break_start),
    path("break/end/", break_end),
]

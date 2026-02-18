from django.urls import path
from .views import audit_logs

urlpatterns = [
    path("logs/", audit_logs),
]

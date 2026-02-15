from django.contrib import admin
from .models import WorkPolicy, WorkSession, Break

@admin.register(WorkPolicy)
class WorkPolicyAdmin(admin.ModelAdmin):
    list_display = ("daily_work_minutes", "daily_break_minutes", "break_mode")

@admin.register(WorkSession)
class WorkSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "start_at", "end_at", "status")
    list_filter = ("status",)

@admin.register(Break)
class BreakAdmin(admin.ModelAdmin):
    list_display = ("session", "start_at", "end_at")
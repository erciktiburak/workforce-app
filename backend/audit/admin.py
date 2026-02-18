from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "entity_type", "entity_id", "organization")
    list_filter = ("action", "entity_type", "created_at", "organization")
    search_fields = ("actor__username", "action", "entity_id")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"

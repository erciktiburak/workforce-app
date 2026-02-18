from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True,
    )

    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
    )

    action = models.CharField(max_length=80)  # e.g. TASK_CREATED, WORK_STARTED
    entity_type = models.CharField(max_length=80)  # e.g. Task, WorkSession, User
    entity_id = models.CharField(max_length=64, blank=True, default="")

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["action", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at} {self.action} by {self.actor_id if self.actor else 'Anonymous'}"

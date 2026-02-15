from django.db import models
from django.conf import settings

class WorkPolicy(models.Model):
    class BreakMode(models.TextChoices):
        FLEXIBLE = "FLEXIBLE", "Flexible"
        FIXED = "FIXED", "Fixed"

    daily_work_minutes = models.PositiveIntegerField(default=480)  # 8 saat
    daily_break_minutes = models.PositiveIntegerField(default=60)
    break_mode = models.CharField(
        max_length=20,
        choices=BreakMode.choices,
        default=BreakMode.FLEXIBLE,
    )
    fixed_break_start = models.TimeField(null=True, blank=True)
    fixed_break_end = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

class WorkSession(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="work_sessions"
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.OPEN,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
        ]

class Break(models.Model):
    session = models.ForeignKey(
        WorkSession,
        on_delete=models.CASCADE,
        related_name="breaks"
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["session"]),
        ]

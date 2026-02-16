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
    def clean(self):
        if self.break_mode == "FIXED":
            if not self.fixed_break_start or not self.fixed_break_end:
                raise ValidationError(
                    "Fixed break times required."
                )
        
        if self.fixed_break_start and self.fixed_break_end:
            if self.fixed_break_end <= self.fixed_break_start:
                raise ValidationError("The break end time must be after the start time.")

    def save(self, *args, **kwargs):
        self.full_clean()
        if not self.pk and WorkPolicy.objects.exists():
            raise Exception("Only one WorkPolicy allowed.")
        return super().save(*args, **kwargs)


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

class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "TODO", "Todo"
        DOING = "DOING", "Doing"
        DONE = "DONE", "Done"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_tasks"
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.TODO,
    )

    due_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["assigned_to", "status"]),
        ]
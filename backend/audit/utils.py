from .models import AuditLog


def get_client_ip(request):
    """Extract client IP from request, handling proxies."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit(request, action, entity_type, entity_id="", metadata=None, organization=None, actor=None):
    """
    Write audit log entry.
    
    Args:
        request: Django request object
        action: Action name (e.g., "TASK_CREATED")
        entity_type: Entity type (e.g., "Task", "WorkSession")
        entity_id: Entity ID (optional)
        metadata: Additional metadata dict (optional)
        organization: Organization override (optional, defaults to actor's org)
        actor: Actor override (optional, defaults to request.user)
    """
    if metadata is None:
        metadata = {}

    if actor is None and hasattr(request, "user") and request.user.is_authenticated:
        actor = request.user

    if organization is None and actor is not None:
        organization = getattr(actor, "organization", None)

    AuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else "",
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:2000],
        metadata=metadata,
    )

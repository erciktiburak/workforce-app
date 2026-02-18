from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import AuditLog


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    """
    Admin için audit log listesi.
    Query params:
    - action: Filter by action type
    - limit: Max results (default 50, max 200)
    """
    if request.user.role != "ADMIN":
        return Response({"detail": "Not allowed"}, status=403)

    org = request.user.organization
    if not org:
        return Response([])

    qs = AuditLog.objects.filter(organization=org).order_by("-created_at")

    action = request.GET.get("action")
    if action:
        qs = qs.filter(action=action)

    limit = int(request.GET.get("limit", "50"))
    limit = max(1, min(limit, 200))

    data = []
    for a in qs[:limit]:
        data.append({
            "id": a.id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "actor": a.actor.username if a.actor else None,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "ip_address": str(a.ip_address) if a.ip_address else None,
            "metadata": a.metadata,
        })

    return Response(data)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsAdmin
from rest_framework.response import Response
from .services import start_session, stop_session, start_break, end_break
from .models import WorkPolicy
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from .models import WorkSession
from .services import calculate_session_duration
from django.db.models import Sum, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate
from .models import Task
from .serializers import TaskSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def weekly_stats(request):
    org = request.user.organization
    if not org:
        return Response([])
    today = timezone.now().date()
    start_date = today - timedelta(days=6)

    sessions = (
        WorkSession.objects
        .filter(organization=org, start_at__date__gte=start_date, status="CLOSED")
        .annotate(
            work_date=TruncDate("start_at"),
            duration=ExpressionWrapper(
                F("end_at") - F("start_at"),
                output_field=DurationField()
            )
        )
        .values("work_date")
        .annotate(total=Sum("duration"))
        .order_by("work_date")
    )

    result = []

    for s in sessions:
        result.append({
            "date": s["work_date"],
            "seconds": int(s["total"].total_seconds())
        })

    return Response(result)

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdmin])
def create_task(request):
    org = request.user.organization
    if not org:
        return Response({"error": "User has no organization"}, status=400)
    assigned_to_id = request.data.get("assigned_to")
    if assigned_to_id is not None:
        try:
            assigned_user = User.objects.get(id=assigned_to_id)
        except User.DoesNotExist:
            return Response({"error": "Assigned user not found"}, status=400)
        if assigned_user.organization_id != org.id:
            return Response(
                {"error": "Cannot assign task to user from another organization"},
                status=400,
            )
    data = request.data.copy()
    data["created_by"] = request.user.id

    serializer = TaskSerializer(data=data)
    if serializer.is_valid():
        serializer.save(
            created_by=request.user,
            organization=org,
        )
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_tasks(request):
    org = request.user.organization
    if not org:
        return Response([])
    tasks = Task.objects.filter(organization=org, assigned_to=request.user)
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def all_tasks(request):
    org = request.user.organization
    if not org:
        return Response([])
    tasks = Task.objects.filter(organization=org)
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_task_status(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
    if task.organization_id != request.user.organization_id:
        return Response({"error": "Task not in your organization"}, status=403)
    if task.assigned_to != request.user and request.user.role != "ADMIN":
        return Response({"error": "Not allowed"}, status=403)

    new_status = request.data.get("status")
    if new_status not in Task.Status.values:
        return Response({"error": "Invalid status"}, status=400)

    task.status = new_status
    task.save()

    return Response({"status": "updated"})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_dashboard(request):
    org = request.user.organization
    if not org:
        return Response({
            "total_users": 0,
            "active_sessions": 0,
            "today_total_work_seconds": 0,
            "today_total_work_hours": 0,
        })
    today = timezone.now().date()

    total_users = User.objects.filter(organization=org).count()
    active_sessions = WorkSession.objects.filter(organization=org, status="OPEN").count()
    today_sessions = WorkSession.objects.filter(
        organization=org,
        start_at__date=today,
        status="CLOSED",
    )

    total_today_duration = timedelta(0)

    for s in today_sessions:
        total_today_duration += calculate_session_duration(s)

    return Response({
        "total_users": total_users,
        "active_sessions": active_sessions,
        "today_total_work_seconds": int(total_today_duration.total_seconds()),
        "today_total_work_hours": round(total_today_duration.total_seconds() / 3600, 2)
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_work(request):
    try:
        session = start_session(request.user)
        return Response({"status": "started", "session_id": session.id})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stop_work(request):
    try:
        stop_session(request.user)
        return Response({"status": "stopped"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def break_start(request):
    try:
        start_break(request.user)
        return Response({"status": "break_started"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def break_end(request):
    try:
        end_break(request.user)
        return Response({"status": "break_ended"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def policy_view(request):
    org = request.user.organization
    if not org:
        return Response({"error": "User has no organization"}, status=400)
    policy, _ = WorkPolicy.objects.get_or_create(
        organization=org,
        defaults={
            "daily_work_minutes": 480,
            "daily_break_minutes": 60,
            "break_mode": WorkPolicy.BreakMode.FLEXIBLE,
        },
    )
    return Response({
        "daily_work_minutes": policy.daily_work_minutes,
        "daily_break_minutes": policy.daily_break_minutes,
        "break_mode": policy.break_mode,
        "fixed_break_start": policy.fixed_break_start,
        "fixed_break_end": policy.fixed_break_end,
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated, IsAdmin])
def update_policy(request):
    org = request.user.organization
    if not org:
        return Response({"error": "User has no organization"}, status=400)
    policy, _ = WorkPolicy.objects.get_or_create(
        organization=org,
        defaults={
            "daily_work_minutes": 480,
            "daily_break_minutes": 60,
            "break_mode": WorkPolicy.BreakMode.FLEXIBLE,
        },
    )

    data = request.data

    if "daily_work_minutes" in data:
        policy.daily_work_minutes = int(data["daily_work_minutes"])
    if "daily_break_minutes" in data:
        policy.daily_break_minutes = int(data["daily_break_minutes"])
    if "break_mode" in data:
        policy.break_mode = data["break_mode"]

    if "fixed_break_start" in data:
        policy.fixed_break_start = data["fixed_break_start"] or None
    if "fixed_break_end" in data:
        policy.fixed_break_end = data["fixed_break_end"] or None

    policy.full_clean()
    policy.save()

    return Response({"ok": True})
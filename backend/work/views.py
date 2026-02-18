from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsAdmin
from rest_framework.response import Response
from .services import start_session, stop_session, start_break, end_break
from .models import WorkPolicy
from django.utils import timezone
from datetime import timedelta, datetime
from calendar import monthrange
from accounts.models import User
from accounts.utils import resolve_user_status
from .models import WorkSession
from .services import calculate_session_duration
from django.db.models import Sum, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate
from .models import Task
from .serializers import TaskSerializer
import csv
from django.http import HttpResponse
from io import BytesIO


def _net_seconds(session: WorkSession, now):

    end = session.end_at or now
    total = (end - session.start_at).total_seconds()
    total_break = session.total_break_seconds or 0

    if session.break_start:
        total_break += (now - session.break_start).total_seconds()

    net = max(0, total - total_break)
    return int(net), int(total_break), int(total)


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
    tasks = Task.objects.filter(organization=org).select_related("assigned_to", "created_by")
    
    # Custom serializer response with username
    data = []
    for t in tasks:
        data.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "assigned_to": t.assigned_to.username if t.assigned_to else None,
            "assigned_to_id": t.assigned_to.id if t.assigned_to else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "status": t.status,
        })
    
    return Response(data)

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
    if new_status == "DONE":
        task.completed_at = timezone.now()
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

    session = WorkSession.objects.filter(
        user=request.user,
        end_at__isnull=True,
        status="OPEN",
    ).first()
    
    if not session:
        return Response({"error": "No active session"}, status=400)
    
    # Eğer break'teyse, break süresini hesapla ve ekle
    if session.break_start:
        diff = int((timezone.now() - session.break_start).total_seconds())
        session.total_break_seconds += diff
        session.break_start = None
        session.on_break = False
    
    session.end_at = timezone.now()
    session.status = WorkSession.Status.CLOSED
    session.save(update_fields=["end_at", "status", "break_start", "on_break", "total_break_seconds"])
    
    return Response({"status": "stopped"})

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_break_start(request):

    session = WorkSession.objects.filter(
        user=request.user,
        end_at__isnull=True,
        status="OPEN",
    ).first()
    if not session:
        return Response({"error": "No active session"}, status=400)
    session.break_start = timezone.now()
    session.on_break = True
    session.save(update_fields=["break_start", "on_break"])
    return Response({"message": "Break started"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_break_end(request):

    session = WorkSession.objects.filter(
        user=request.user,
        end_at__isnull=True,
        status="OPEN",
    ).first()
    if not session:
        return Response({"error": "No active session"}, status=400)
    if session.break_start:
        diff = int((timezone.now() - session.break_start).total_seconds())
        session.total_break_seconds += diff
    session.break_start = None
    session.on_break = False
    session.save(update_fields=["break_start", "on_break", "total_break_seconds"])
    return Response({"message": "Break ended"})


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_work_status(request):

    session = WorkSession.objects.filter(
        user=request.user,
        end_at__isnull=True,
        status="OPEN"
    ).exists()

    return Response({"active": session})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_daily_stats(request):

    sessions = WorkSession.objects.filter(
        user=request.user,
        start_at__date=timezone.now().date()
    )

    total = 0
    now = timezone.now()

    for s in sessions:
        net, _, _ = _net_seconds(s, now)
        total += net

    return Response({
        "today_seconds": int(total)
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_live_session(request):

    session = WorkSession.objects.filter(
        user=request.user,
        end_at__isnull=True,
        status="OPEN"
    ).first()

    if not session:
        return Response({"active": False})

    now = timezone.now()

    worked = (now - session.start_at).total_seconds()
    worked -= session.total_break_seconds

    if session.break_start:
        break_now = (now - session.break_start).total_seconds()
        total_break = session.total_break_seconds + break_now
    else:
        total_break = session.total_break_seconds

    return Response({
        "active": True,
        "on_break": bool(session.break_start),
        "work_seconds": int(max(0, worked)),
        "break_seconds": int(total_break),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_today_timeline(request):
    """
    Employee için günlük timeline verisi.
    Timeline visualization için kullanılır.
    """
    sessions = WorkSession.objects.filter(
        user=request.user,
        start_at__date=timezone.now().date()
    ).order_by("start_at")

    data = []

    now = timezone.now()

    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        data.append({
            "start": s.start_at.isoformat() if s.start_at else None,
            "end": s.end_at.isoformat() if s.end_at else None,
            "break_seconds": brk,
            "total_seconds": ttl,
            "net_seconds": net,
        })

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_analytics(request):

    now = timezone.now()
    today = now.date()

    sessions = WorkSession.objects.filter(
        user=request.user,
        start_at__date=today,
    )

    net_sum = 0
    break_sum = 0
    total_sum = 0

    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        net_sum += net
        break_sum += brk
        total_sum += ttl

    return Response({
        "today": {
            "net_seconds": net_sum,
            "break_seconds": break_sum,
            "total_seconds": total_sum,
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_weekly(request):
    """
    Employee için son 7 gün net çalışma süreleri.
    """
    now = timezone.now()
    start = now.date() - timedelta(days=6)

    sessions = WorkSession.objects.filter(
        user=request.user,
        start_at__date__gte=start,
    )

    day_map = {(start + timedelta(days=i)).isoformat(): 0 for i in range(7)}

    for s in sessions:
        day = s.start_at.date().isoformat()
        net, _, _ = _net_seconds(s, now)
        day_map[day] = day_map.get(day, 0) + net

    data = [
        {"date": date_str, "hours": round(seconds / 3600, 2)}
        for date_str, seconds in sorted(day_map.items())
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_summary(request):

    if request.user.role != "ADMIN":
        return Response(status=403)

    org = request.user.organization
    if not org:
        return Response({
            "top_workers": [],
            "tasks": {"total": 0, "done": 0, "completion_rate": 0.0},
        })

    now = timezone.now()
    start = now.date() - timedelta(days=6)

    sessions = (
        WorkSession.objects
        .filter(
            organization=org,
            start_at__date__gte=start,
        )
        .select_related("user")
    )

    user_map = {}

    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        uid = s.user_id
        if uid not in user_map:
            user_map[uid] = {
                "id": uid,
                "username": s.user.username,
                "net_seconds": 0,
                "break_seconds": 0,
                "total_seconds": 0,
            }
        user_map[uid]["net_seconds"] += net
        user_map[uid]["break_seconds"] += brk
        user_map[uid]["total_seconds"] += ttl

    tasks_qs = Task.objects.filter(organization=org)
    tasks_total = tasks_qs.count()
    tasks_done = tasks_qs.filter(status="DONE").count()

    top = sorted(user_map.values(), key=lambda x: x["net_seconds"], reverse=True)[:10]

    return Response({
        "top_workers": [
            {
                "id": u["id"],
                "username": u["username"],
                "hours": round(u["net_seconds"] / 3600, 2),
                "break_ratio": round(
                    (u["break_seconds"] / max(1, u["total_seconds"])) * 100, 1
                ),
            }
            for u in top
        ],
        "tasks": {
            "total": tasks_total,
            "done": tasks_done,
            "completion_rate": round(
                (tasks_done / max(1, tasks_total)) * 100, 1
            ),
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id):

    if request.user.role != "ADMIN":
        return Response(status=403)

    org = request.user.organization
    if not org:
        return Response(status=400)

    try:
        user = User.objects.get(
            id=user_id,
            organization=org,
        )
    except User.DoesNotExist:
        return Response(status=404)

    now = timezone.now()
    today = now.date()

    sessions = WorkSession.objects.filter(
        user=user,
        start_at__date=today,
    ).order_by("start_at")

    net_sum = 0
    break_sum = 0
    total_sum = 0
    start_time = None

    for s in sessions:
        if start_time is None:
            start_time = s.start_at
        net, brk, ttl = _net_seconds(s, now)
        net_sum += net
        break_sum += brk
        total_sum += ttl

    # active task (DOING)
    active_task = Task.objects.filter(
        organization=org,
        assigned_to=user,
        status="DOING",
    ).order_by("-created_at").values("id", "title", "status", "created_at").first()

    # weekly net seconds (last 7 days)
    start = today - timedelta(days=6)
    weekly_sessions = WorkSession.objects.filter(
        user=user,
        start_at__date__gte=start,
    )

    day_map = {(start + timedelta(days=i)).isoformat(): 0 for i in range(7)}
    for s in weekly_sessions:
        day = s.start_at.date().isoformat()
        net, _, _ = _net_seconds(s, now)
        day_map[day] = day_map.get(day, 0) + net

    weekly = [
        {"date": date_str, "hours": round(seconds / 3600, 2)}
        for date_str, seconds in sorted(day_map.items())
    ]

    # task completion rate (assigned tasks only)
    tasks_qs = Task.objects.filter(organization=org, assigned_to=user)
    tasks_total = tasks_qs.count()
    tasks_done = tasks_qs.filter(status="DONE").count()
    completion_rate = round((tasks_done / max(1, tasks_total)) * 100, 1)

    return Response({
        "id": user.id,
        "username": user.username,
        "status": resolve_user_status(user),
        "today": {
            "start_time": start_time.isoformat() if start_time else None,
            "net_seconds": int(net_sum),
            "break_seconds": int(break_sum),
            "total_seconds": int(total_sum),
        },
        "weekly": weekly,
        "active_task": active_task,
        "tasks": {
            "total": tasks_total,
            "done": tasks_done,
            "completion_rate": completion_rate,
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_productivity_ranking(request):

    if request.user.role != "ADMIN":
        return Response(status=403)

    org = request.user.organization
    if not org:
        return Response([])

    now = timezone.now()
    start_date = now.date() - timedelta(days=6)

    users = User.objects.filter(organization=org).only("id", "username")

    ranking = []

    for user in users:
        sessions = WorkSession.objects.filter(
            organization=org,
            user=user,
            start_at__date__gte=start_date,
        )

        net_sum = 0
        break_sum = 0
        total_sum = 0

        for s in sessions:
            net, brk, ttl = _net_seconds(s, now)
            net_sum += net
            break_sum += brk
            total_sum += ttl

        weekly_hours = net_sum / 3600
        break_ratio = (break_sum / total_sum) if total_sum > 0 else 0.0

        tasks_qs = Task.objects.filter(
            organization=org,
            assigned_to=user,
            created_at__date__gte=start_date,
        )
        tasks_total = tasks_qs.count()
        tasks_done = tasks_qs.filter(status="DONE").count()

        completion_rate = (tasks_done / tasks_total) if tasks_total > 0 else 0.0

        work_score = min(weekly_hours / 40, 1) * 50
        break_score = (1 - break_ratio) * 20
        task_score = completion_rate * 30

        final_score = round(work_score + break_score + task_score, 1)

        ranking.append({
            "id": user.id,
            "username": user.username,
            "weekly_hours": round(weekly_hours, 2),
            "completion_rate": round(completion_rate * 100, 1),
            "break_ratio": round(break_ratio * 100, 1),
            "score": final_score,
        })

    ranking.sort(key=lambda x: x["score"], reverse=True)

    return Response(ranking)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_alerts(request):

    if request.user.role != "ADMIN":
        return Response(status=403)

    org = request.user.organization
    if not org:
        return Response([])

    now = timezone.now()
    start_date = now.date() - timedelta(days=6)

    users = User.objects.filter(organization=org).only("id", "username")

    alerts = []

    for user in users:
        sessions = WorkSession.objects.filter(
            organization=org,
            user=user,
            start_at__date__gte=start_date,
        )

        net_sum = 0
        break_sum = 0
        total_sum = 0
        active_days = set()

        for s in sessions:
            net, brk, ttl = _net_seconds(s, now)
            net_sum += net
            break_sum += brk
            total_sum += ttl
            active_days.add(s.start_at.date())

        weekly_hours = net_sum / 3600
        break_ratio = (break_sum / total_sum) if total_sum > 0 else 0.0

        work_score = min(weekly_hours / 40, 1) * 50
        break_score = (1 - break_ratio) * 20
        task_score = 0  

        score = work_score + break_score + task_score

        user_alerts = []

        if score < 50:
            user_alerts.append("LOW_PRODUCTIVITY")

        if break_ratio > 0.35:
            user_alerts.append("HIGH_BREAK_RATIO")

        if weekly_hours < 5:
            user_alerts.append("LOW_ACTIVITY")

        if len(active_days) <= 1:
            user_alerts.append("INACTIVE")

        if user_alerts:
            alerts.append({
                "id": user.id,
                "username": user.username,
                "alerts": user_alerts,
                "score": round(score, 1),
                "weekly_hours": round(weekly_hours, 1),
                "break_ratio": round(break_ratio * 100, 1),
            })

    return Response(alerts)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_monthly_csv(request):
    """
    Admin için aylık çalışma raporu CSV export.
    Query params: year, month
    """
    if request.user.role != "ADMIN":
        return Response(status=403)

    org = request.user.organization
    if not org:
        return Response({"error": "No organization"}, status=400)

    try:
        year = int(request.GET.get("year", timezone.now().year))
        month = int(request.GET.get("month", timezone.now().month))
    except (ValueError, TypeError):
        return Response({"error": "Invalid year or month"}, status=400)

    last_day = monthrange(year, month)[1]
    start_date = timezone.make_aware(datetime(year, month, 1))
    end_date = timezone.make_aware(datetime(year, month, last_day, 23, 59, 59))

    sessions = WorkSession.objects.filter(
        organization=org,
        start_at__range=(start_date, end_date),
    ).select_related("user").order_by("user__username", "start_at")

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="monthly_report_{year}_{month:02d}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        "Username",
        "Start Time",
        "End Time",
        "Net Hours",
        "Break Minutes",
    ])

    now = timezone.now()
    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        writer.writerow([
            s.user.username,
            s.start_at.isoformat() if s.start_at else "",
            s.end_at.isoformat() if s.end_at else "",
            round(net / 3600, 2),
            round(brk / 60, 1),
        ])

    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_monthly_pdf(request):
    """
    Employee için aylık PDF raporu.
    Query params: year, month
    """
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
    except ImportError:
        return Response(
            {"error": "reportlab not installed. Run: pip install reportlab"},
            status=500,
        )

    try:
        year = int(request.GET.get("year", timezone.now().year))
        month = int(request.GET.get("month", timezone.now().month))
    except (ValueError, TypeError):
        return Response({"error": "Invalid year or month"}, status=400)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(612, 792))
    elements = []

    styles = getSampleStyleSheet()
    elements.append(Paragraph(f"Monthly Work Report - {month}/{year}", styles["Heading1"]))
    elements.append(Spacer(1, 20))

    sessions = WorkSession.objects.filter(
        user=request.user,
        start_at__year=year,
        start_at__month=month,
    ).order_by("start_at")

    now = timezone.now()

    # Summary
    total_net = 0
    total_break = 0
    total_sessions = sessions.count()

    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        total_net += net
        total_break += brk

    elements.append(Paragraph(f"Total Sessions: {total_sessions}", styles["Normal"]))
    elements.append(Paragraph(f"Total Net Hours: {round(total_net / 3600, 2)}", styles["Normal"]))
    elements.append(Paragraph(f"Total Break Minutes: {round(total_break / 60, 1)}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Table
    data = [["Date", "Start Time", "End Time", "Net Hours", "Break Minutes"]]

    for s in sessions:
        net, brk, ttl = _net_seconds(s, now)
        data.append([
            s.start_at.date().isoformat() if s.start_at else "",
            s.start_at.strftime("%H:%M") if s.start_at else "",
            s.end_at.strftime("%H:%M") if s.end_at else "Ongoing",
            str(round(net / 3600, 2)),
            str(round(brk / 60, 1)),
        ])

    if len(data) > 1:
        table = Table(data)
        elements.append(table)
    else:
        elements.append(Paragraph("No sessions found for this month.", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="monthly_report_{month:02d}_{year}.pdf"'

    return response

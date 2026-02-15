from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import start_session, stop_session, start_break, end_break
from .models import WorkPolicy

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
    policy = WorkPolicy.objects.first() or WorkPolicy.objects.create()
    return Response({
        "daily_work_minutes": policy.daily_work_minutes,
        "daily_break_minutes": policy.daily_break_minutes,
        "break_mode": policy.break_mode,
        "fixed_break_start": policy.fixed_break_start,
        "fixed_break_end": policy.fixed_break_end,
    })
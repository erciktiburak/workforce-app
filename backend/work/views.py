from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import start_session, stop_session, start_break, end_break

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_work(request):
    session = start_session(request.user)
    return Response({"status": "started", "session_id": session.id})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stop_work(request):
    stop_session(request.user)
    return Response({"status": "stopped"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def break_start(request):
    start_break(request.user)
    return Response({"status": "break_started"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def break_end(request):
    end_break(request.user)
    return Response({"status": "break_ended"})

from django.utils import timezone
from datetime import timedelta
from api.permissions import IsAdmin
from accounts.models import User
from accounts.utils import resolve_user_status
from work.models import WorkSession, Task
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

COOKIE_ACCESS = "access_token"
COOKIE_REFRESH = "refresh_token"

COOKIE_KWARGS = {
    "httponly": True,
    "samesite": "Lax",  
    "secure": False,   
    "path": "/",     
}

def _set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(COOKIE_ACCESS, access, httponly=True, samesite="Lax")
    response.set_cookie(COOKIE_REFRESH, refresh, httponly=True, samesite="Lax")

def _clear_auth_cookies(response: Response):
    response.delete_cookie(COOKIE_ACCESS)
    response.delete_cookie(COOKIE_REFRESH)

class CookieTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = getattr(user, "role", "EMPLOYEE")
        return token

class CookieTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        print(f"Login request received: {request.data}")
        try:
            resp = super().post(request, *args, **kwargs)

            access = resp.data.get("access")
            refresh = resp.data.get("refresh")

            resp.data = {"ok": True}

            resp.set_cookie(
                "access_token",
                access,
                httponly=True,
                samesite="Lax",
                secure=False,
            )

            resp.set_cookie(
                "refresh_token",
                refresh,
                httponly=True,
                samesite="Lax",
                secure=False,
            )
            print("Login successful, cookies set.")
            return resp

        except Exception as e:
            print(f"Login error: {str(e)}")
            return Response({"error": "Identity could not be verified."}, status=401)


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(COOKIE_REFRESH)
        if not refresh:
            return Response({"detail": "No refresh cookie."}, status=401)
        
        request.data["refresh"] = refresh

        resp = super().post(request, *args, **kwargs)
        access = resp.data.get("access")
        resp.data = {"ok": True}
        resp.set_cookie(COOKIE_ACCESS, access, **COOKIE_KWARGS)
        return resp

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def online_users(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)
    org = request.user.organization
    if not org:
        return Response([])
    users = User.objects.filter(organization=org)
    data = []
    for u in users:
        status = resolve_user_status(u)
        data.append({
            "id": u.id,
            "username": u.username,
            "status": status,
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
        })
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organization_users_detailed(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)
    org = request.user.organization
    if not org:
        return Response([])
    users = User.objects.filter(organization=org)
    data = []
    for u in users:
        status = resolve_user_status(u)
        session = WorkSession.objects.filter(
            user=u, end_at__isnull=True, status="OPEN"
        ).first()
        start_time = session.start_at.isoformat() if session and session.start_at else None
        current_task = Task.objects.filter(
            assigned_to=u, status__in=["TODO", "DOING"]
        ).order_by("-created_at").values("id", "title", "status").first()
        data.append({
            "id": u.id,
            "username": u.username,
            "status": status,
            "start_time": start_time,
            "current_task": current_task,
        })
    return Response(data)
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ping(request):
    user = request.user
    user.last_seen_at = timezone.now()
    user.save(update_fields=["last_seen_at"])
    return Response({"ok": True})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cookie_logout(request):
    resp = Response({"ok": True})
    resp.delete_cookie(COOKIE_ACCESS)
    resp.delete_cookie(COOKIE_REFRESH)
    return resp

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    resp = Response({"ok": True})
    _clear_auth_cookies(resp)
    return resp

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    u = request.user
    role = getattr(u, "role", "EMPLOYEE") or "EMPLOYEE"
    return Response({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": role,
        "last_seen_at": u.last_seen_at,
        "organization": u.organization.name if u.organization else None,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ping_view(request):
    request.user.last_seen_at = timezone.now()
    request.user.save(update_fields=["last_seen_at"])
    return Response({"ok": True, "last_seen_at": request.user.last_seen_at})

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_users_view(request):
    org = request.user.organization
    if not org:
        return Response([])
    users = User.objects.filter(organization=org).order_by("-last_seen_at").values(
        "id", "username", "email", "role", "is_active", "last_seen_at"
    )
    return Response(list(users))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)
    
    try:
        user = User.objects.get(
            id=user_id,
            organization=request.user.organization
        )
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    session = WorkSession.objects.filter(
        user=user,
        end_at__isnull=True,
        status="OPEN"
    ).first()

    start_time = session.start_at.isoformat() if session and session.start_at else None

    total_seconds_today = 0

    sessions_today = WorkSession.objects.filter(
        user=user,
        start_at__date=timezone.now().date()
    )

    now = timezone.now()
    for s in sessions_today:
        if s.end_at:
            total = (s.end_at - s.start_at).total_seconds()
        else:
            total = (now - s.start_at).total_seconds()

        total -= s.total_break_seconds
        total_seconds_today += max(0, total)

    return Response({
        "username": user.username,
        "status": resolve_user_status(user),
        "current_start_time": start_time,
        "today_work_seconds": int(total_seconds_today),
    })

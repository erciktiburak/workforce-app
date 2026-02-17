from django.utils import timezone
from datetime import timedelta
from api.permissions import IsAdmin
from accounts.models import User
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
@permission_classes([IsAuthenticated, IsAdmin])
def online_users(request):
    threshold = timezone.now() - timedelta(seconds=60)

    users = User.objects.filter(last_seen_at__gte=threshold)

    return Response([
        {
            "id": u.id,
            "username": u.username,
            "last_seen_at": u.last_seen_at,
        }
        for u in users
    ])
    
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
    from accounts.models import User
    users = User.objects.order_by("-last_seen_at").values("id", "username", "email", "role", "is_active", "last_seen_at")
    return Response(list(users))

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .permissions import IsAdmin

COOKIE_ACCESS = "access_token"
COOKIE_REFRESH = "refresh_token"

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
    serializer_class = CookieTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        access = resp.data.get("access")
        refresh = resp.data.get("refresh")
        resp.data = {"ok": True}
        _set_auth_cookies(resp, access, refresh)
        return resp

class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(COOKIE_REFRESH)
        if not refresh:
            return Response({"detail": "No refresh cookie."}, status=401)
        request.data["refresh"] = refresh

        resp = super().post(request, *args, **kwargs)
        access = resp.data.get("access")
        resp.data = {"ok": True}
        resp.set_cookie(COOKIE_ACCESS, access, httponly=True, samesite="Lax")
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
    return Response({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
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

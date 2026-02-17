"""
WebSocket middleware: authenticate from JWT in cookie (access_token).
Sets scope["user"] so PresenceConsumer can use it.
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken
from accounts.models import User


def get_cookie_from_scope(scope):
    headers = scope.get("headers") or []
    for name, value in headers:
        if name == b"cookie":
            return value.decode("utf-8")
    return ""


def parse_cookie(cookie_header):
    out = {}
    for part in cookie_header.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


@database_sync_to_async
def get_user_from_token(access_token):
    if not access_token:
        return AnonymousUser()
    try:
        token = AccessToken(access_token)
        user_id = token.get("user_id")
        if user_id is None:
            return AnonymousUser()
        user = User.objects.get(id=user_id)
        return user
    except (InvalidToken, User.DoesNotExist):
        return AnonymousUser()


class JwtCookieAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        cookie_header = get_cookie_from_scope(scope)
        cookies = parse_cookie(cookie_header)
        access_token = cookies.get("access_token")
        scope["user"] = await get_user_from_token(access_token)
        return await super().__call__(scope, receive, send)



from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CookieTokenObtainPairView, CookieTokenRefreshView, cookie_logout, me_view, ping, online_users
from accounts.views import create_employee, organization_users, create_invite, accept_invite

urlpatterns = [
    # JWT (Bearer) auth endpoints
    path("auth/login/", CookieTokenObtainPairView.as_view(), name="cookie_login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="cookie_refresh"),
    path("auth/logout/", cookie_logout, name="cookie_logout"),
    path("me/", me_view, name="me"),
    path("ping/", ping),
    path("online-users/", online_users),
    # User management
    path("users/", organization_users),
    path("users/create/", create_employee),
    # Invites
    path("invites/create/", create_invite),
    path("invites/accept/<uuid:token>/", accept_invite),
]

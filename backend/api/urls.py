from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CookieTokenObtainPairView, CookieTokenRefreshView, cookie_logout, me_view

urlpatterns = [
    # JWT (Bearer) auth endpoints
    path("auth/login/", CookieTokenObtainPairView.as_view(), name="cookie_login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="cookie_refresh"),
    path("auth/logout/", cookie_logout, name="cookie_logout"),
    path("me/", me_view, name="me"),
]

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Workforce", {"fields": ("role", "last_seen_at")}),
    )
    list_display = ("username", "email", "role", "is_active", "last_seen_at", "is_staff")

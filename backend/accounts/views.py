from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password

from .models import User, Invite


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_employee(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)
    if not request.user.organization:
        return Response({"error": "User has no organization"}, status=400)

    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Missing fields"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)

    user = User.objects.create(
        username=username,
        email=email or "",
        password=make_password(password),
        role="EMPLOYEE",
        organization=request.user.organization,
    )

    return Response({"message": "Employee created", "id": user.id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organization_users(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)

    org = request.user.organization
    if not org:
        return Response([])

    users = User.objects.filter(organization=org)
    data = [
        {"id": u.id, "username": u.username, "role": u.role}
        for u in users
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_invite(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Unauthorized"}, status=403)
    if not request.user.organization:
        return Response({"error": "User has no organization"}, status=400)

    email = request.data.get("email")
    if not email:
        return Response({"error": "Email required"}, status=400)

    invite = Invite.objects.create(
        email=email.strip(),
        organization=request.user.organization,
        created_by=request.user,
        expires_at=timezone.now() + timedelta(days=3),
    )
    invite_link = f"http://localhost:3000/invite/{invite.token}"

    return Response({
        "message": "Invite created",
        "invite_link": invite_link,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def accept_invite(request, token):
    try:
        invite = Invite.objects.get(token=token, is_used=False)
    except Invite.DoesNotExist:
        return Response({"error": "Invalid invite"}, status=400)

    if invite.expires_at < timezone.now():
        return Response({"error": "Invite expired"}, status=400)

    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"error": "Missing fields"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)

    User.objects.create(
        username=username.strip(),
        email=invite.email,
        password=make_password(password),
        role="EMPLOYEE",
        organization=invite.organization,
    )
    invite.is_used = True
    invite.save(update_fields=["is_used"])

    return Response({"message": "Account created"})

from django.utils import timezone
from django.db import transaction
from .models import WorkSession, Break

def start_session(user):
    if WorkSession.objects.filter(user=user, status="OPEN").exists():
        raise Exception("Active session already exists.")

    return WorkSession.objects.create(
        user=user,
        start_at=timezone.now(),
    )


@transaction.atomic
def stop_session(user):
    session = WorkSession.objects.filter(user=user, status="OPEN").first()
    if not session:
        raise Exception("No active session.")

    if session.breaks.filter(end_at__isnull=True).exists():
        raise Exception("Cannot stop while break is active.")

    session.end_at = timezone.now()
    session.status = "CLOSED"
    session.save()
    return session


@transaction.atomic
def start_break(user):
    session = WorkSession.objects.filter(user=user, status="OPEN").first()
    if not session:
        raise Exception("No active session.")

    if session.breaks.filter(end_at__isnull=True).exists():
        raise Exception("Break already active.")

    return Break.objects.create(
        session=session,
        start_at=timezone.now(),
    )


@transaction.atomic
def end_break(user):
    session = WorkSession.objects.filter(user=user, status="OPEN").first()
    if not session:
        raise Exception("No active session.")

    br = session.breaks.filter(end_at__isnull=True).first()
    if not br:
        raise Exception("No active break.")

    br.end_at = timezone.now()
    br.save()
    return br

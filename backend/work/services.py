from django.utils import timezone
from django.db import transaction
from .models import WorkSession, Break, WorkPolicy
from datetime import timedelta
from django.db.models import Sum, F, ExpressionWrapper, DurationField
from django.db.models.functions import Coalesce
from django.utils import timezone



def calculate_session_duration(session):
    if not session.end_at:
        return timedelta(0)

    total_time = session.end_at - session.start_at

    breaks = session.breaks.filter(end_at__isnull=False)

    total_break = timedelta(0)
    for br in breaks:
        total_break += (br.end_at - br.start_at)

    return total_time - total_break

def get_today_work_duration(user):
    today = timezone.now().date()

    sessions = WorkSession.objects.filter(
        user=user,
        start_at__date=today,
        status="CLOSED"
    )

    total = timedelta(0)
    for s in sessions:
        total += calculate_session_duration(s)

    return total

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

    policy = WorkPolicy.objects.first() or WorkPolicy.objects.create()
    allowed_work = timedelta(minutes=policy.daily_work_minutes)

    proposed_end = timezone.now()
    session.end_at = proposed_end
    
    session_duration = calculate_session_duration(session)
    today_total = get_today_work_duration(user) + session_duration
    
    if today_total > allowed_work:
        raise Exception("Daily work limit exceeded.")

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

    policy = WorkPolicy.objects.first() or WorkPolicy.objects.create()
    allowed_break = timedelta(minutes=policy.daily_break_minutes)
    
    today = timezone.now().date()
    all_today_sessions = WorkSession.objects.filter(user=user, start_at__date=today)
    
    total_break_duration = timedelta(0)
    for s in all_today_sessions:
        for b in s.breaks.filter(end_at__isnull=False):
            total_break_duration += (b.end_at - b.start_at)

    if total_break_duration > allowed_break:
        raise Exception("Daily break limit exceeded.")

    return br

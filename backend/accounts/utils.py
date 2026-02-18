from django.utils import timezone
from work.models import WorkSession


def resolve_user_status(user):
    """
    Merkezi kullanıcı status resolver.
    Tüm endpoint'lerde aynı mantığı kullanmak için.
    
    Status mantığı:
    1) Aktif WorkSession yok → OFFLINE
    2) Aktif WorkSession var:
        - break_start dolu → BREAK
        - break_start boş → WORKING
    3) last_seen_at eskiyse ama session aktifse → WORKING (IDLE değil)
    
    IDLE artık sadece session yok ama yakın zamanda aktif olmuş kullanıcı için anlamlı.
    """
    now = timezone.now()

    session = WorkSession.objects.filter(
        user=user,
        end_at__isnull=True,
        status="OPEN"
    ).first()

    if session:
        # Aktif session var
        if session.break_start or session.on_break:
            return "break"
        # Session aktif ve break değil → WORKING (IDLE değil)
        return "working"

    # Session yoksa TTL bak
    if user.last_seen_at:
        diff = (now - user.last_seen_at).total_seconds()
        if diff < 120:  # 2 dakika içinde aktif olmuş
            return "idle"

    return "offline"

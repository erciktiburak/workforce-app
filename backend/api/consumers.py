import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from accounts.models import User


class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return

        self.user_id = user.id
        self.org_id = getattr(user, "organization_id", None)
        self.group_name = f"presence_org_{self.org_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.mark_seen()

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence_event",
                "user_id": self.user_id,
                "username": user.username,
                "status": "online",
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        await self.mark_seen()

    async def presence_event(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def mark_seen(self):
        User.objects.filter(id=self.user_id).update(last_seen_at=timezone.now())

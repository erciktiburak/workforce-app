# Data migration: link existing Task, WorkSession, WorkPolicy to Default Org

from django.db import migrations


def backfill_organization(apps, schema_editor):
    Organization = apps.get_model("accounts", "Organization")
    Task = apps.get_model("work", "Task")
    WorkSession = apps.get_model("work", "WorkSession")
    WorkPolicy = apps.get_model("work", "WorkPolicy")
    org = Organization.objects.filter(name="Default Org").first()
    if not org:
        return
    Task.objects.filter(organization__isnull=True).update(organization=org)
    WorkSession.objects.filter(organization__isnull=True).update(organization=org)
    WorkPolicy.objects.filter(organization__isnull=True).update(organization=org)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_link_users_to_default_org"),
        ("work", "0003_task_organization_workpolicy_organization_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_organization, noop),
    ]

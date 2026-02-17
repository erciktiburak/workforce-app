# Data migration: create Default Org and link users

from django.db import migrations


def create_default_org_and_link_users(apps, schema_editor):
    Organization = apps.get_model("accounts", "Organization")
    User = apps.get_model("accounts", "User")
    org, _ = Organization.objects.get_or_create(name="Default Org")
    User.objects.filter(organization__isnull=True).update(organization=org)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_organization_user_organization"),
    ]

    operations = [
        migrations.RunPython(create_default_org_and_link_users, noop),
    ]

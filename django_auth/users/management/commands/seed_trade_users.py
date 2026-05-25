from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SEED = [
    {"username": "lynxos", "password": "3888", "role": "admin", "is_staff": True, "is_superuser": True},
    {"username": "ahror", "password": "9930", "role": "user", "is_staff": False, "is_superuser": False},
]

class Command(BaseCommand):
    help = "Lynxos va Ahror loginlarini yaratadi/yangilaydi"

    def handle(self, *args, **options):
        for item in SEED:
            u = item["username"].lower()
            user, created = User.objects.get_or_create(
                username=u,
                defaults={
                    "role": item["role"],
                    "is_staff": item["is_staff"],
                    "is_superuser": item["is_superuser"],
                    "is_active": True,
                },
            )
            user.set_password(item["password"])
            user.role = item["role"]
            user.is_staff = item["is_staff"]
            user.is_superuser = item["is_superuser"]
            user.is_active = True
            user.save()
            action = "yaratildi" if created else "yangilandi"
            self.stdout.write(self.style.SUCCESS(f"  {u} / {item['password']} — {action}"))

        self.stdout.write(self.style.SUCCESS("Tayyor. Django Admin: /admin/"))

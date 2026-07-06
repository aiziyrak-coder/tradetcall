import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SEED = [
    {"username": "lynxos", "password": "3888", "role": "admin", "is_staff": True, "is_superuser": True},
    {"username": "ahror", "password": "9930", "role": "user", "is_staff": False, "is_superuser": False},
    {"username": "javlon", "password": "123123", "role": "user", "is_staff": False, "is_superuser": False},
]

FORCE_RESET = os.environ.get("TRADE_FORCE_RESET_PASSWORD", "").strip() in ("1", "true", "yes")


class Command(BaseCommand):
    help = "Lynxos va Ahror loginlarini yaratadi (parol faqat yangi user yoki FORCE_RESET)"

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
            user.role = item["role"]
            user.is_staff = item["is_staff"]
            user.is_superuser = item["is_superuser"]
            user.is_active = True

            if created or FORCE_RESET:
                user.set_password(item["password"])
                pwd_note = "parol o'rnatildi"
            else:
                pwd_note = "mavjud parol saqlandi"

            user.save()
            action = "yaratildi" if created else "yangilandi"
            self.stdout.write(self.style.SUCCESS(f"  {u} — {action}, {pwd_note}"))

        self.stdout.write(self.style.SUCCESS("Tayyor. Django Admin: /admin/"))

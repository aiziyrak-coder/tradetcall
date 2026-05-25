from django.contrib.auth.models import AbstractUser
from django.db import models

class TradeUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"

    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        default=Role.USER,
    )

    class Meta:
        verbose_name = "Savdo foydalanuvchisi"
        verbose_name_plural = "Savdo foydalanuvchilari"

    @property
    def is_trade_admin(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_superuser

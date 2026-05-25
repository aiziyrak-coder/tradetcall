from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import TradeUser

@admin.register(TradeUser)
class TradeUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff", "last_login", "date_joined")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)

    fieldsets = UserAdmin.fieldsets + (
        ("XAUUSD rol", {"fields": ("role",)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("XAUUSD rol", {"fields": ("role",)}),
    )

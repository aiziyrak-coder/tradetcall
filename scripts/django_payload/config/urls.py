from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "XAUUSD Trade — Foydalanuvchilar"
admin.site.site_title = "XAUUSD Admin"
admin.site.index_title = "Foydalanuvchilarni boshqarish"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
]

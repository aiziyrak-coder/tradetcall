import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const d = path.join(root, "django_auth");

function w(rel, content) {
  const p = path.join(d, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

w("requirements.txt", `Django>=5.0,<6
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.6
PyJWT>=2.8
`);

w("manage.py", `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
`);

w("config/settings.py", fs.readFileSync(path.join(root, "scripts", "_django_settings.py"), "utf8"));
w("config/urls.py", fs.readFileSync(path.join(root, "scripts", "_django_urls.py"), "utf8"));
w("config/wsgi.py", `import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
`);

w("users/models.py", fs.readFileSync(path.join(root, "scripts", "_django_models.py"), "utf8"));
w("users/apps.py", `from django.apps import AppConfig
class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
    verbose_name = "Savdo foydalanuvchilari"
`);
w("users/admin.py", fs.readFileSync(path.join(root, "scripts", "_django_admin.py"), "utf8"));
w("users/permissions.py", fs.readFileSync(path.join(root, "scripts", "_django_permissions.py"), "utf8"));
w("users/serializers.py", fs.readFileSync(path.join(root, "scripts", "_django_serializers.py"), "utf8"));
w("users/views.py", fs.readFileSync(path.join(root, "scripts", "_django_views.py"), "utf8"));
w("users/urls.py", `from django.urls import path
from . import views
urlpatterns = [
    path("login/", views.login_view),
    path("me/", views.me_view),
    path("users/", views.users_list_view),
]
`);
w("users/migrations/__init__.py", "");
w("users/management/__init__.py", "");
w("users/management/commands/__init__.py", "");
w("users/management/commands/seed_trade_users.py", fs.readFileSync(path.join(root, "scripts", "_django_seed.py"), "utf8"));

console.log("django_auth yaratildi:", d);

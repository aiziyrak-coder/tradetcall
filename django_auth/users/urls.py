from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.login_view),
    path("me/", views.me_view),
    path("users/", views.users_list_view),
    path("users/<int:pk>/", views.user_detail_view),
    path("users/<int:pk>/reset-password/", views.user_reset_password_view),
]

from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import TradeUser

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs["username"].strip().lower()
        password = attrs["password"]
        user = authenticate(
            request=self.context.get("request"),
            username=username,
            password=password,
        )
        if user is None:
            try:
                u = TradeUser.objects.get(username=username)
                if u.check_password(password) and not u.is_active:
                    raise serializers.ValidationError("Hisob o'chirilgan")
            except TradeUser.DoesNotExist:
                pass
            raise serializers.ValidationError("Login yoki parol noto'g'ri")
        if not user.is_active:
            raise serializers.ValidationError("Hisob o'chirilgan")
        attrs["user"] = user
        return attrs

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeUser
        fields = ("id", "username", "role", "is_active", "date_joined")
        read_only_fields = fields

    def to_representation(self, instance):
        return {
            "id": str(instance.pk),
            "username": instance.username,
            "role": instance.role,
            "active": instance.is_active,
            "createdAt": instance.date_joined.isoformat() if instance.date_joined else "",
        }

class SessionSerializer(serializers.Serializer):
    @staticmethod
    def from_user(user: TradeUser):
        return {
            "userId": str(user.pk),
            "username": user.username,
            "role": user.role if not user.is_superuser else "admin",
        }

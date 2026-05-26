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
            "role": instance.role if not instance.is_superuser else "admin",
            "active": instance.is_active,
            "createdAt": instance.date_joined.isoformat() if instance.date_joined else "",
        }

class UserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=2, max_length=64)
    password = serializers.CharField(min_length=4, max_length=128, write_only=True)
    role = serializers.ChoiceField(choices=TradeUser.Role.choices, default=TradeUser.Role.USER)

    def validate_username(self, value):
        name = value.strip().lower()
        if TradeUser.objects.filter(username=name).exists():
            raise serializers.ValidationError("Bu login band")
        return name

    def create(self, validated_data):
        user = TradeUser(
            username=validated_data["username"],
            role=validated_data["role"],
            is_active=True,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class UserUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=2, max_length=64, required=False)
    role = serializers.ChoiceField(choices=TradeUser.Role.choices, required=False)
    active = serializers.BooleanField(required=False)

    def validate_username(self, value):
        name = value.strip().lower()
        instance = self.context.get("instance")
        if (
            instance
            and TradeUser.objects.filter(username=name).exclude(pk=instance.pk).exists()
        ):
            raise serializers.ValidationError("Bu login band")
        return name

    def update(self, instance, validated_data):
        if "username" in validated_data:
            instance.username = validated_data["username"]
        if "role" in validated_data:
            instance.role = validated_data["role"]
        if "active" in validated_data:
            instance.is_active = validated_data["active"]
        instance.save()
        return instance

class UserResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=4, max_length=128, write_only=True)

class SessionSerializer(serializers.Serializer):
    @staticmethod
    def from_user(user: TradeUser):
        return {
            "userId": str(user.pk),
            "username": user.username,
            "role": user.role if not user.is_superuser else "admin",
        }

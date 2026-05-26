from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TradeUser
from .permissions import IsTradeAdmin
from .serializers import (
    LoginSerializer,
    SessionSerializer,
    UserCreateSerializer,
    UserPublicSerializer,
    UserResetPasswordSerializer,
    UserUpdateSerializer,
)

def _tokens_for_user(user: TradeUser):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }

def _admin_count() -> int:
    return TradeUser.objects.filter(
        Q(role=TradeUser.Role.ADMIN) | Q(is_superuser=True),
        is_active=True,
    ).count()

def _get_user_or_404(pk: int) -> TradeUser | None:
    try:
        return TradeUser.objects.get(pk=pk)
    except (TradeUser.DoesNotExist, ValueError, TypeError):
        return None

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    ser = LoginSerializer(data=request.data, context={"request": request})
    if not ser.is_valid():
        err = ser.errors.get("non_field_errors", ["Login yoki parol noto'g'ri"])
        msg = err[0] if isinstance(err, list) else str(err)
        return Response({"ok": False, "error": str(msg)}, status=status.HTTP_401_UNAUTHORIZED)

    user = ser.validated_data["user"]
    tokens = _tokens_for_user(user)
    return Response({
        "ok": True,
        "token": tokens["access"],
        "session": SessionSerializer.from_user(user),
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    if not isinstance(user, TradeUser) or not user.is_active:
        return Response({"session": None})
    return Response({"session": SessionSerializer.from_user(user)})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsTradeAdmin])
def users_list_view(request):
    if request.method == "GET":
        users = TradeUser.objects.all().order_by("username")
        data = UserPublicSerializer(users, many=True).data
        return Response({"ok": True, "users": data})

    ser = UserCreateSerializer(data=request.data)
    if not ser.is_valid():
        first = next(iter(ser.errors.values()))[0]
        return Response({"ok": False, "error": str(first)}, status=status.HTTP_400_BAD_REQUEST)
    user = ser.save()
    return Response(
        {"ok": True, "user": UserPublicSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsTradeAdmin])
def user_detail_view(request, pk):
    target = _get_user_or_404(pk)
    if not target:
        return Response({"ok": False, "error": "Foydalanuvchi topilmadi"}, status=404)

    actor = request.user
    if not isinstance(actor, TradeUser):
        return Response({"ok": False, "error": "Ruxsat yo'q"}, status=403)

    if request.method == "DELETE":
        if target.pk == actor.pk:
            return Response(
                {"ok": False, "error": "O'zingizni o'chira olmaysiz"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.is_trade_admin and _admin_count() <= 1:
            return Response(
                {"ok": False, "error": "Oxirgi adminni o'chirib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_active = False
        target.save(update_fields=["is_active"])
        return Response({"ok": True, "user": UserPublicSerializer(target).data})

    ser = UserUpdateSerializer(
        data=request.data,
        partial=True,
        context={"instance": target},
    )
    if not ser.is_valid():
        first = next(iter(ser.errors.values()))[0]
        return Response({"ok": False, "error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

    new_role = request.data.get("role")
    new_active = request.data.get("active")
    if target.pk == actor.pk:
        if new_role and new_role != "admin":
            return Response(
                {"ok": False, "error": "O'z rolingizni pasaytira olmaysiz"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_active is False:
            return Response(
                {"ok": False, "error": "O'zingizni o'chirib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if (
        target.is_trade_admin
        and new_role == TradeUser.Role.USER
        and _admin_count() <= 1
    ):
        return Response(
            {"ok": False, "error": "Oxirgi admin rolini o'zgartira olmaysiz"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_active is False and target.is_trade_admin and _admin_count() <= 1:
        return Response(
            {"ok": False, "error": "Oxirgi adminni o'chirib bo'lmaydi"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = ser.update(target, ser.validated_data)
    return Response({"ok": True, "user": UserPublicSerializer(user).data})

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTradeAdmin])
def user_reset_password_view(request, pk):
    target = _get_user_or_404(pk)
    if not target:
        return Response({"ok": False, "error": "Foydalanuvchi topilmadi"}, status=404)

    ser = UserResetPasswordSerializer(data=request.data)
    if not ser.is_valid():
        first = next(iter(ser.errors.values()))[0]
        return Response({"ok": False, "error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

    target.set_password(ser.validated_data["password"])
    target.save(update_fields=["password"])
    return Response({"ok": True, "message": f"{target.username} paroli yangilandi"})

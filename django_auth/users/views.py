from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TradeUser
from .permissions import IsTradeAdmin
from .serializers import LoginSerializer, SessionSerializer, UserPublicSerializer

def _tokens_for_user(user: TradeUser):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }

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

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTradeAdmin])
def users_list_view(request):
    users = TradeUser.objects.all().order_by("username")
    data = UserPublicSerializer(users, many=True).data
    return Response({"ok": True, "users": data})

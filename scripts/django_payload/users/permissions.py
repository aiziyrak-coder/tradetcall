from rest_framework.permissions import BasePermission

from .models import TradeUser

class IsTradeAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            isinstance(user, TradeUser)
            and user.is_active
            and (user.is_trade_admin or user.is_staff)
        )

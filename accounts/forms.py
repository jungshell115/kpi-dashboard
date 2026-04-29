from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = CustomUser
        fields = ('email', 'username', 'department', 'assigned_project')
        help_texts = {
            'username': '고유한 사용자명을 입력하세요.',
            'email': '반드시 @ccon.kr 도메인 이메일을 사용해야 합니다.',
        }

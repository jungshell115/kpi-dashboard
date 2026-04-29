from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Department, Project

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'department', 'assigned_project', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('추가 정보', {'fields': ('department', 'assigned_project')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('추가 정보', {'fields': ('email', 'department', 'assigned_project')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Department)
admin.site.register(Project)

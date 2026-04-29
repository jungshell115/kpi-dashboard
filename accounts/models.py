from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.conf import settings

class Department(models.Model):
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name

class Project(models.Model):
    name = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='projects')
    
    def __str__(self):
        return self.name

def validate_internal_domain(value):
    if not value.endswith(f'@{settings.INTERNAL_DOMAIN}'):
        raise ValidationError(f'가입은 @{settings.INTERNAL_DOMAIN} 도메인만 가능합니다.')

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True, validators=[validate_internal_domain])
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    assigned_project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

from django.contrib import admin
from .models import KPI, KPIPerformance, AuditLog

admin.site.register(KPI)
admin.site.register(KPIPerformance)
admin.site.register(AuditLog)

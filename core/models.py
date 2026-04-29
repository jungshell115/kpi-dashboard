from django.db import models
from django.conf import settings
from accounts.models import Project

class KPI(models.Model):
    STATUS_CHOICES = (
        ('PENDING', '승인 대기'),
        ('APPROVED', '승인됨'),
        ('REJECTED', '반려됨'),
    )
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='kpis')
    name = models.CharField(max_length=200)
    description = models.TextField()
    target_value = models.FloatField()
    ai_suggested_category = models.CharField(max_length=100, blank=True)
    final_category = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"[{self.project.name}] {self.name}"

class KPIPerformance(models.Model):
    STATUS_CHOICES = (
        ('OPEN', '입력 가능'),
        ('CLOSED', '마감됨'),
        ('PENDING_APPROVAL', '수정 승인 대기'),
    )

    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE, related_name='performances')
    month = models.IntegerField() # 1~12
    achieved_value = models.FloatField(null=True, blank=True)
    evidence_file = models.FileField(upload_to='evidence/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('kpi', 'month')

    def __str__(self):
        return f"{self.kpi.name} - {self.month}월"

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    performance = models.ForeignKey(KPIPerformance, on_delete=models.CASCADE)
    old_value = models.FloatField(null=True)
    new_value = models.FloatField(null=True)
    reason = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log: {self.performance} by {self.user}"

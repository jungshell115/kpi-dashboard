from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
from .models import KPI, KPIPerformance
from .ai_service import suggest_kpi_category
from datetime import datetime

@login_required
def dashboard(request):
    user = request.user
    kpis = []
    
    if user.assigned_project:
        kpis = KPI.objects.filter(project=user.assigned_project)
        
        # Ensure KPIPerformance exists for current month
        current_month = datetime.now().month
        for kpi in kpis:
            KPIPerformance.objects.get_or_create(kpi=kpi, month=current_month)
            
    # Get performances
    performances = KPIPerformance.objects.filter(kpi__in=kpis).select_related('kpi')
    
    context = {
        'performances': performances,
        'project_name': user.assigned_project.name if user.assigned_project else "할당된 사업 없음",
    }
    return render(request, 'core/dashboard.html', context)

@login_required
def add_kpi(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description')
        target_value = request.POST.get('target_value')
        
        # Call AI for suggestion
        suggested_category = suggest_kpi_category(description)
        
        KPI.objects.create(
            project=request.user.assigned_project,
            name=name,
            description=description,
            target_value=target_value,
            ai_suggested_category=suggested_category,
            status='PENDING'
        )
        return redirect('dashboard')
    
    return render(request, 'core/add_kpi.html')

# --- Cron Jobs for Vercel ---
@csrf_exempt
def cron_auto_close_kpi(request):
    """매월 5일 호출되어 상태를 CLOSED로 변경"""
    current_month = datetime.now().month
    # 5일이 지났으면 이전 달 실적들을 마감 (간단한 로직)
    performances = KPIPerformance.objects.filter(status='OPEN')
    count = performances.update(status='CLOSED')
    return JsonResponse({"status": "success", "closed_count": count})

@csrf_exempt
def cron_reminder_email(request):
    """매월 3일 호출되어 미입력자에게 이메일 발송"""
    current_month = datetime.now().month
    empty_performances = KPIPerformance.objects.filter(month=current_month, achieved_value__isnull=True, status='OPEN')
    
    users_to_remind = set()
    for perf in empty_performances:
        # Find users assigned to this project
        users = perf.kpi.project.customuser_set.all()
        for u in users:
            if u.email:
                users_to_remind.add(u.email)
                
    if users_to_remind and settings.EMAIL_HOST_USER:
        send_mail(
            subject='[알림] 이번 달 KPI 실적 입력 마감 2일 전입니다.',
            message='이번 달 KPI 실적을 5일까지 반드시 입력해 주시기 바랍니다.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=list(users_to_remind),
            fail_silently=True,
        )
        
    return JsonResponse({"status": "success", "emails_sent": len(users_to_remind)})

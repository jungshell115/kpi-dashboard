from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('add-kpi/', views.add_kpi, name='add_kpi'),
    path('api/cron/auto-close-kpi', views.cron_auto_close_kpi, name='cron_auto_close'),
    path('api/cron/reminder-email', views.cron_reminder_email, name='cron_reminder'),
]

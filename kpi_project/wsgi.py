import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kpi_project.settings')

application = get_wsgi_application()
app = application

# Vercel 환경 데이터베이스 세팅 및 정적 파일 자동화
try:
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'migrate'])
    execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
except Exception as e:
    print(f"Startup scripts failed: {e}")

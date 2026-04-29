import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kpi_project.settings')

application = get_wsgi_application()

# Vercel app alias
app = application

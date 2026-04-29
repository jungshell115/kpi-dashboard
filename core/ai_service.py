import google.generativeai as genai
from django.conf import settings

def suggest_kpi_category(description):
    if not settings.GEMINI_API_KEY:
        return "미분류 (API 키 누락)"
        
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"다음 KPI 지표 설명을 읽고, 가장 적합한 카테고리(예: 고용창출, 매출액, 기술개발, 기타 중 하나)를 단답형으로 추천해줘.\n설명: {description}\n카테고리:"
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"분류 실패: {str(e)}"

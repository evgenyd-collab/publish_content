# API Server для генерации статей

Простой Flask сервер, который использует `publisher_multisite.py` для генерации статей через OpenAI API.

## Установка

1. Установите зависимости:
```bash
pip install flask flask-cors
```

Или если у вас есть `requirements.txt`:
```bash
pip install -r requirements.txt
```

2. Убедитесь, что в `.env` файле есть:
```env
OPENAI_API_KEY=your-openai-api-key
```

## Запуск

```bash
python api_server.py
```

Сервер запустится на `http://localhost:5000`

## Использование

### Создание статей

POST `/articles`

```json
{
  "topics": ["тема 1", "тема 2"],
  "site_key": "gapola",
  "status": "draft"
}
```

Ответ:
```json
{
  "articles": [
    {
      "id": 1,
      "topic": "тема 1",
      "title": "Заголовок статьи",
      "meta_title": "SEO заголовок",
      "meta_description": "SEO описание",
      "slug": "slug-stati",
      "content_html": "<h2>...</h2>",
      "image_prompt": "описание изображения",
      "site_key": "gapola",
      "status": "draft"
    }
  ],
  "total": 1,
  "success": 1
}
```

## Настройка фронтенда

В `.env` файле фронтенда добавьте (опционально, если сервер не на localhost:5000):

```env
VITE_ARTICLES_API_BASE=http://localhost:5000
```

Если не указать, будет использоваться `http://localhost:5000` по умолчанию.


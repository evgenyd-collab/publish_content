"""
Простой API сервер для генерации статей через OpenAI
Использует функции из publisher_multisite.py
"""
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Импортируем функции из publisher_multisite
from publisher_multisite import (
    generate_article,
    generate_image,
    generate_slug_from_topic,
    generate_and_publish_for_site,
)
from config_multisite import SITES_CONFIG

load_dotenv()

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с фронтенда

@app.route('/', methods=['GET'])
def root():
    """Корневой путь - информация об API"""
    return jsonify({
        "status": "ok",
        "message": "Articles Generation API",
        "endpoints": {
            "POST /articles": "Создание статей из тем",
            "GET /articles": "Список статей",
            "GET /health": "Проверка работоспособности"
        }
    })

@app.route('/health', methods=['GET'])
def health():
    """Проверка работоспособности сервера"""
    return jsonify({"status": "ok", "message": "API server is running"})

@app.route('/articles', methods=['POST'])
def create_article():
    """
    Создание статьи(ей) из тем
    Принимает:
    {
        "topics": ["тема 1", "тема 2"],  # массив тем
        "site_key": "gapola",
        "status": "draft"  # или "publish"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Тело запроса пустое"}), 400
        
        topics = data.get('topics', [])
        if not topics:
            return jsonify({"error": "Не указаны темы (topics)"}), 400
        
        if not isinstance(topics, list):
            topics = [topics]  # Если передана одна тема как строка
        
        site_key = data.get('site_key', 'gapola')
        status = data.get('status', 'draft')
        publish = (status == 'publish')
        
        # Проверяем, что сайт существует
        if site_key not in SITES_CONFIG:
            return jsonify({"error": f"Сайт '{site_key}' не найден в конфигурации"}), 400
        
        results = []
        
        for topic in topics:
            try:
                # Генерируем статью через OpenAI
                print(f"[API] Генерация статьи для темы: {topic}")
                article = generate_article(topic, SITES_CONFIG[site_key]['prompt_profile'])
                
                # Генерируем slug из темы
                article['slug'] = generate_slug_from_topic(topic)
                print(f"[API] Статья сгенерирована: {article.get('title', 'без названия')}")
                print(f"[API] Проверка конфигурации сайта '{site_key}'...")
                print(f"[API]   wp_url: {SITES_CONFIG[site_key].get('wp_url')}")
                print(f"[API]   username: {SITES_CONFIG[site_key].get('username')}")
                print(f"[API]   app_password: {'установлен' if SITES_CONFIG[site_key].get('app_password') else 'НЕ УСТАНОВЛЕН!'}")
                
                # ВСЕГДА создаём пост в WordPress (даже если статус draft)
                wp_post_id = None
                print(f"[API] ===== НАЧАЛО СОЗДАНИЯ ПОСТА В WORDPRESS =====")
                print(f"[API] Статус: {status}")
                try:
                    from publisher_multisite import create_post, upload_media, generate_image
                    import os
                    
                    print(f"[API] Импорты успешны")
                    print(f"[API] Создание поста в WordPress (статус: {status})...")
                    
                    # Генерируем изображение (опционально, но попробуем)
                    media_id = None
                    try:
                        image_path = f"{article['slug'] or 'article'}.webp"
                        print(f"[API] Генерация изображения...")
                        generate_image(article["image_prompt"], image_path)
                        
                        print(f"[API] Загрузка изображения в WordPress...")
                        media_id = upload_media(site_key, image_path)
                        print(f"[API] Изображение загружено, Media ID: {media_id}")
                        
                        # Удаляем временный файл
                        if os.path.exists(image_path):
                            os.remove(image_path)
                    except Exception as img_error:
                        print(f"[API] ⚠️ Не удалось сгенерировать/загрузить изображение: {img_error}")
                        print(f"[API] Продолжаю без обложки...")
                    
                    # Создаём пост в WordPress
                    print(f"[API] Параметры создания поста:")
                    print(f"  - site_key: {site_key}")
                    print(f"  - status: {status}")
                    print(f"  - slug: {article['slug']}")
                    print(f"  - title: {article.get('title')}")
                    print(f"  - meta_title: {article.get('meta_title', 'не указан')[:50]}...")
                    print(f"  - meta_description: {article.get('meta_description', 'не указана')[:50]}...")
                    print(f"  - seo_plugin: будет определён автоматически при публикации")
                    print(f"  - media_id: {media_id}")
                    
                    wp_post_id = create_post(
                        site_key=site_key,
                        article=article,
                        media_id=media_id,
                        status=status,  # "draft" или "publish"
                        category_id=None  # Используется default_category_id из конфига
                    )
                    
                    print(f"[API] ✅ Пост создан в WordPress!")
                    print(f"[API]   Post ID: {wp_post_id}")
                    print(f"[API]   Slug: {article['slug']}")
                    print(f"[API]   Title: {article.get('title')}")
                    print(f"[API]   Status: {status}")
                    print(f"[API]   URL: {SITES_CONFIG[site_key]['wp_url']}?p={wp_post_id}")
                    
                except Exception as wp_error:
                    print(f"[API] ❌ ОШИБКА при создании поста в WordPress!")
                    print(f"[API]   Тип ошибки: {type(wp_error).__name__}")
                    print(f"[API]   Сообщение: {str(wp_error)}")
                    import traceback
                    print(f"[API]   Traceback:")
                    traceback.print_exc()
                    # Возвращаем статью даже если публикация не удалась
                    wp_post_id = None
                
                from datetime import datetime
                results.append({
                    'id': len(results) + 1,  # Временный ID
                    'topic': topic,
                    'title': article.get('title'),
                    'meta_title': article.get('meta_title'),
                    'meta_description': article.get('meta_description'),
                    'slug': article.get('slug'),
                    'content_html': article.get('content_html'),
                    'image_prompt': article.get('image_prompt'),
                    'site_key': site_key,
                    'status': status,
                    'wp_post_id': wp_post_id,
                    'published': wp_post_id is not None,
                    'created_at': datetime.now().isoformat(),
                    **article
                })
                
            except Exception as e:
                # Если ошибка при генерации одной статьи, продолжаем с остальными
                print(f"[API] ❌ Ошибка при генерации статьи для темы '{topic}': {e}")
                import traceback
                traceback.print_exc()
                results.append({
                    'id': len(results) + 1,
                    'topic': topic,
                    'error': str(e),
                    'status': 'error'
                })
        
        return jsonify({
            'articles': results,
            'total': len(results),
            'success': len([r for r in results if 'error' not in r])
        }), 200
        
    except Exception as e:
        import traceback
        print(f"[API] ❌ Критическая ошибка: {e}")
        traceback.print_exc()
        return jsonify({
            "error": f"Ошибка сервера: {str(e)}",
            "type": type(e).__name__
        }), 500

@app.route('/articles', methods=['GET'])
def list_articles():
    """
    Список статей (заглушка, можно подключить БД)
    """
    return jsonify({
        'articles': [],
        'total': 0,
        'total_pages': 1
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Запуск API сервера на http://localhost:{port}")
    print(f"📝 Используется OpenAI API для генерации статей")
    
    app.run(host='0.0.0.0', port=port, debug=debug)


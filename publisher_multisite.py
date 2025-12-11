import os
import io
import json
import re
import traceback

def load_topics_from_file(path: str) -> list[str]:
    """Читает темы из файла: одна строка = одна тема."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Файл с темами не найден: {path}")

    topics = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            t = line.strip()
            if not t:
                continue
            if t.startswith("#"):
                continue
            topics.append(t)

    if not topics:
        raise RuntimeError(f"Файл {path} прочитан, но тем в нём нет.")

    return topics

from typing import Optional

import requests
from dotenv import load_dotenv
from PIL import Image
from openai import OpenAI

from config_multisite import SITES_CONFIG


# =========================
#   ИНИЦИАЛИЗАЦИЯ OpenAI
# =========================

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("Не указан OPENAI_API_KEY в .env")

client = OpenAI(api_key=OPENAI_API_KEY)


# =========================
#   PROMPT ШАБЛОН
# =========================

BASE_PROMPT_TEMPLATE = """
Напиши экспертную SEO-оптимизированную статью по теме:
[УКАЖИ ТЕМУ]

Ты — журналист и редактор уровня Спорт-Экспресс, Чемпионат.com, Sports.ru, с большим практическим опытом в спорте, ставках и онлайн-казино. Ты пишешь как живой человек, а не как нейросеть, не как научный работник и не как банковский аналитик.

1. Объём и базовые ограничения

Объём статьи: 1000–1500 слов.
Если текст получается короче 1000 слов — ОБЯЗАТЕЛЬНО расширь каждый смысловой блок,
добавь примеры, цифры, детали и практические рекомендации, пока объём не превысит 1000 слов.

Это полноценная развернутая SEO-статья, а не краткая справка.

Текст должен:
— глубоко раскрывать тему,
— включать несколько смысловых уровней,
— содержать примеры, цифры, детали,
— не быть сжатым или обзорным.

Запрещено использовать:
линии-разделители
эмодзи
формальные нейросетевые шаблоны
пафос, восхваление, абстрактные рассуждения
рекламный тон

2. SEO-требования (обязательно)

Используй ключевые слова из кластера и LSI-термины естественно, без переспама.
В конце статьи обязательно добавь:
✅ Meta Title до 70 символов.
Ключевая фраза — максимально близко к началу. Должен быть кликабельным, а не формальным.
Не указывай количество символов в ответе.

✅ Meta Description до 160 символов.
Должен привлекать пользователя, а не быть техническим. Запрещены любые вводные формулы, в том числе:
«Узнайте…», «На нашем сайте…», «Мы расскажем…» и любые аналоги на других языках.
Не указывай количество символов в ответе.

3. Структура статьи (строго соблюдать)

H1 — Заголовок статьи.
Введение без подзаголовка:
— короткое, цепляющее, живое;
— сразу объясняет значимость темы.

Основные разделы с H2:
— каждый H2 — отдельный смысловой блок;
— внутри допускаются H3. Если блок H3 состоит из одного предложения, лучше сделать в форме списка;
— запрещено ставить H3 сразу после H2: между ними обязательно должен быть переходный абзац.

Финальный смысловой блок (без слов «Заключение», «Финальный смысловой блок» или схожих):
— заголовок должен соотноситься с темой;
— логично завершает тему;
— содержит выводы и практические рекомендации.

4. Таблицы и списки

В тексте:
— минимум 1 таблица;
— минимум 1 список.

Можно больше, только если это оправдано по смыслу.
Таблицы и списки должны усиливать материал, а не быть формальностью.

5. Содержание (усиленные требования)

Обязательно использовать:
— проверенные факты;
— точные или ориентировочные цифры;
— реальные примеры.

Обязательно упоминать:
— актуальные данные;
— события;
— изменения и тренды.

Каждый абзац обязан нести практическую пользу.

Добавлять:
— практические советы;
— мини-разборы;
— последствия решений.

Вода полностью запрещена.

❌ Запрещённые примеры:
«Футбол — очень популярный вид спорта…»
«Это было величественно и незабываемо…»
«Это не просто гонки, а нечто большее…»
«Он показал, что такое настоящий характер…»

6. Анти-ИИ требования

Избегать:
— одинаковых ритмов предложений;
— повторяющихся начальных конструкций;
— шаблонных связок.

Текст должен выглядеть как редакторская аналитика с опытом, а не как генерация.

7. Язык, стиль и подача

Язык: естественный, живой, русский.
Пояснять так, как для новичка, но без упрощённого примитивизма.

Тон:
— уверенный;
— экспертный;
— спокойный;
— без заигрывания.

Стиль:
— аналитический;
— информативный;
— редакторский.

Избегать повторов слов.

8. Жёсткие стилистические запреты

Сравнения — не более 1–2 раз за весь текст.
Минимизировать тире.
Запрещены конструкции:
«Спорт — это…»

Запрещено:
— говорить о заработке на ставках;
— обещать прибыль, доход, деньги;
— писать как подросток;
— писать как мотиватор;
— писать как рекламный текст.

9. Финальный контроль качества

Перед сдачей текста проверь:
— нет воды;
— нет пафоса;
— нет обещаний заработка;
— есть факты, цифры, логика;
— есть таблица и список;
— нет нейросетевых штампов;
— текст читается как профессиональная редакторская аналитика.

10. Формат ответа (строго)

Верни ответ строго в формате JSON-объекта со следующими полями верхнего уровня:

- "title": строка — H1 статьи (без HTML-тегов), будет использован как заголовок записи в WordPress.
- "meta_title": строка — SEO Title
- "meta_description": строка — SEO Description
- "slug": строка — человекопонятный URL-слиз (латиницей, через дефисы, без пробелов и спецсимволов)
- "content_html": строка — ПОЛНЫЙ HTML-код статьи без <html>, <head>, <body>, НО:
    * СТРОГО БЕЗ тега <h1> внутри контента.
    * Допускаются только <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <td>.
    * без <hr> и любых линий-разделителей.
- "image_prompt": строка — подробное текстовое описание картинки 1280x720 (16:9), без текста на изображении, для WebP до 100 КБ.

Никакого текста вне JSON.
"""


def build_system_prompt(topic: str, prompt_profile: str) -> str:
    """
    На будущее можно развести под разные сайты через prompt_profile.
    Пока просто подставляем тему в базовый шаблон.
    """
    prompt = BASE_PROMPT_TEMPLATE.replace("[УКАЖИ ТЕМУ]", topic.strip())
    return prompt


def normalize_content_html(html: str) -> str:
    """Удаляем H1 из контента на всякий случай и приводим к чистому HTML без лишнего заголовка."""
    if not isinstance(html, str):
        html = str(html)

    # убираем ведущий <h1>...</h1>, если он стоит первым блоком
    html = re.sub(
        r'^\\s*<h1[^>]*>.*?</h1>\\s*',
        '',
        html,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # если где-то ещё остался <h1> — превращаем его в <h2>
    html = re.sub(r'<h1([^>]*)>', r'<h2\\1>', html, flags=re.IGNORECASE)
    html = re.sub(r'</h1>', '</h2>', html, flags=re.IGNORECASE)

    return html


def generate_slug_from_topic(topic: str, max_length: int = 60, max_words: int = 5) -> str:
    """
    Генерирует короткий ЧПУ:
    - берём тему как строку,
    - отсекаем всё после дефисов/двоеточий,
    - оставляем только первые max_words слов,
    - транслитерируем,
    - чистим,
    - режем по длине.
    """
    import re

    # 1) к нижнему регистру и обрезаем края
    topic = (topic or "").lower().strip()

    if not topic:
        return "statya"

    # 2) отрезаем всё лишнее после знаков: -, –, —, :, |
    base = re.split(r"[-–—:|]", topic, maxsplit=1)[0].strip()

    # 3) оставляем только первые N слов (ключевую часть)
    words = base.split()
    if not words:
        words = topic.split()
    words = words[:max_words]
    base = " ".join(words)

    # 4) транслитерация (ru -> en)
    translit_map = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l",
        "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s",
        "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch",
        "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
        "э": "e", "ю": "yu", "я": "ya"
    }
    slug = "".join(translit_map.get(ch, ch) for ch in base)

    # 5) чистим всё, кроме латиницы, цифр, пробелов и дефисов
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)

    # 6) пробелы -> дефисы
    slug = re.sub(r"\s+", "-", slug)

    # 7) схлопываем повторные дефисы
    slug = re.sub(r"-+", "-", slug)

    # 8) убираем дефисы по краям
    slug = slug.strip("-")

    # 9) режем по длине
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")

    # 10) страховка, если вдруг всё вырезали
    if not slug:
        slug = "statya"

    return slug


# =========================
#   GENERATE ARTICLE
# =========================

def generate_article(
    topic: str,
    prompt_profile: str,
    min_words: int = 1000,
    max_retries: int = 3
) -> dict:
    """
    Генерация статьи с приоритетом длины.
    Пытаемся до max_retries раз получить текст не короче min_words.
    Если не получилось — возвращаем самую длинную из удачных попыток.
    """
    system_prompt = build_system_prompt(topic, prompt_profile)

    last_raw = None
    best_data = None
    best_wc = 0

    for attempt in range(1, max_retries + 1):
        print(f"[DEBUG] Попытка генерации текста #{attempt} для темы: {topic!r}")

        response = client.chat.completions.create(
            model="gpt-5.1",
            response_format={"type": "json_object"},
            temperature=0.55,
            messages=[
                {"role": "system", "content": system_prompt},
            ],
        )

        raw = response.choices[0].message.content
        last_raw = raw

        # Парсим JSON
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"[WARN] Невалидный JSON на попытке #{attempt}: {e}")
            continue

        # Проверяем обязательные ключи
        required_keys = [
            "title",
            "meta_title",
            "meta_description",
            "slug",
            "content_html",
            "image_prompt",
        ]
        missing = [k for k in required_keys if k not in data]
        if missing:
            print(f"[WARN] На попытке #{attempt} отсутствуют ключи: {missing}")
            continue

        # Нормализуем контент (убираем H1 и т.п.)
        data["content_html"] = normalize_content_html(data["content_html"])

        # Проверяем объём
        wc = len(str(data["content_html"]).split())
        print(f"[DEBUG] Объём текста на попытке #{attempt}: {wc} слов")

        # обновляем "лучшую" попытку
        if wc > best_wc:
            best_wc = wc
            best_data = data

        if wc < min_words:
            print(
                f"[WARN] Текст слишком короткий ({wc} слов, минимум {min_words}), "
                f"пробую сгенерировать заново…"
            )
            continue

        # Всё ОК — достаточно длинный текст
        return data

    # Если сюда дошли — ни одна попытка не достигла min_words
    if best_data is None:
        # вообще не было валидного JSON
        raise RuntimeError(
            f"Не удалось получить валидную статью для темы {topic!r} "
            f"за {max_retries} попыток. Последний сырой ответ модели:\n{last_raw}"
        )

    print(
        f"[WARN] Ни одна попытка не достигла {min_words} слов. "
        f"Использую лучшую версию на {best_wc} слов."
    )
    return best_data


# =========================
#   IMAGE GENERATION
# =========================

def generate_image(image_prompt: str, out_path: str) -> str:
    """
    Генерация изображения через gpt-image-1.
    Если в организации нет доступа к модели — вызывающий код должен ловить исключение.
    """
    img = client.images.generate(
        model="gpt-image-1",
        prompt=image_prompt,
        size="1024x1024",
    )

    image_url = img.data[0].url

    resp = requests.get(image_url)
    if resp.status_code != 200:
        raise RuntimeError(f"Не удалось скачать картинку, статус {resp.status_code}")

    image = Image.open(io.BytesIO(resp.content)).convert("RGB")

    # Сохраняем в WebP и сжимаем до <= 100 КБ
    quality = 80
    image.save(out_path, format="WEBP", quality=quality)

    while os.path.getsize(out_path) > 100_000 and quality > 40:
        quality -= 5
        image.save(out_path, format="WEBP", quality=quality)

    return out_path


# =========================
#   WORDPRESS HELPERS
# =========================

def upload_media(site_key: str, image_path: str) -> int:
    cfg = SITES_CONFIG[site_key]
    wp_url = cfg["wp_url"].rstrip("/")
    username = cfg["username"]
    app_password = cfg["app_password"]

    endpoint = f"{wp_url}/wp-json/wp/v2/media"

    filename = os.path.basename(image_path)
    with open(image_path, "rb") as f:
        files = {
            "file": (filename, f, "image/webp"),
        }
        data = {
            "title": filename,
            "status": "inherit",
        }

        resp = requests.post(
            endpoint,
            auth=(username, app_password),
            files=files,
            data=data,
            timeout=60,
        )

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"[{site_key}] Ошибка загрузки медиа в WP: {resp.status_code} {resp.text}"
        )

    j = resp.json()
    return int(j["id"])


def create_post(
    site_key: str,
    article: dict,
    media_id: Optional[int] = None,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
) -> int:
    cfg = SITES_CONFIG[site_key]
    wp_url = cfg["wp_url"].rstrip("/")
    username = cfg["username"]
    app_password = cfg["app_password"]

    endpoint = f"{wp_url}/wp-json/wp/v2/posts"

    payload: dict = {
        "title": article["title"],
        "content": article["content_html"],
        "status": status or "draft",
    }

    slug = (article.get("slug") or "").strip()
    if slug:
        payload["slug"] = slug

    # Категория
    if category_id:
        payload["categories"] = [category_id]
    elif cfg.get("default_category_id"):
        payload["categories"] = [cfg["default_category_id"]]

    # Обложка
    if media_id:
        payload["featured_media"] = media_id

    # SEO-плагин Rank Math
    seo_plugin = cfg.get("seo_plugin")
    if seo_plugin == "rankmath":
        meta = payload.setdefault("meta", {})
        meta["rank_math_title"] = article["meta_title"]
        meta["rank_math_description"] = article["meta_description"]

    resp = requests.post(
        endpoint,
        auth=(username, app_password),
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"[{site_key}] Ошибка создания поста в WP: {resp.status_code} {resp.text}"
        )

    j = resp.json()
    return int(j["id"])


# =========================
#   HIGH-LEVEL PIPELINE
# =========================

def generate_and_publish_for_site(
    site_key: str,
    topic: str,
    publish: Optional[bool] = None,
    category_id: Optional[int] = None,
) -> None:
    if site_key not in SITES_CONFIG:
        raise KeyError(f"Сайт '{site_key}' не найден в SITES_CONFIG")

    cfg = SITES_CONFIG[site_key]
    prompt_profile = cfg["prompt_profile"]

    print(f"[{site_key}] Генерация статьи на тему: {topic!r}")
    article = generate_article(topic, prompt_profile)

    # Жёстко задаём ЧПУ из темы (а не из модели)
    article["slug"] = generate_slug_from_topic(topic)
print(f"[DEBUG] Принудительный ЧПУ: {article['slug']}")

    word_count = len(str(article["content_html"]).split())
    print(f"[DEBUG] Итоговый объём текста: {word_count} слов")

    media_id = None

    # Картинка — по возможности, но не критична
    try:
        image_path = f"{article['slug'] or 'article'}.webp"
        print(f"[{site_key}] Генерация изображения...")
        generate_image(article["image_prompt"], image_path)

        print(f"[{site_key}] Загрузка изображения в WordPress...")
        media_id = upload_media(site_key, image_path)
    except Exception as e:
        print(f"[{site_key}] Не удалось сгенерировать/загрузить изображение: {e}")
        print(f"[{site_key}] Продолжаю без обложки.")

    status = "publish" if publish else None
    print(f"[{site_key}] Создание поста в WordPress...")
    post_id = create_post(
        site_key,
        article,
        media_id=media_id,
        status=status,
        category_id=category_id,
    )

    print(f"[{site_key}] Готово. ID поста: {post_id}, slug: {article['slug']}")
    print(f"[{site_key}] Title: {article['title']}")
    print(f"[{site_key}] Meta title: {article['meta_title']}")
    print(f"[{site_key}] Meta description: {article['meta_description']}")


# =========================
#   ENTRY POINT
# =========================

if __name__ == "__main__":
    try:
        site_key = "gapola"  # или "bricker" или любой другой ключ из SITES_CONFIG
        topics_file = "topics.txt"

        print(f"[MAIN] Загружаю темы из файла: {topics_file!r}")
        topics = load_topics_from_file(topics_file)
        print(f"[MAIN] Найдено тем: {len(topics)}")

        for i, topic in enumerate(topics, start=1):
            print(f"\n[MAIN] === Тема #{i}: {topic!r} ===")
            try:
                # publish=False — создаём черновики; поставишь True, когда будешь готов публиковать сразу
                generate_and_publish_for_site(site_key, topic, publish=False)
            except Exception as e:
                print(f"[MAIN][ERROR] Ошибка при обработке темы #{i}: {topic!r}")
                traceback.print_exc()

        print("\n[MAIN] Обработка всех тем завершена.")

    except Exception as e:
        print("\nПроизошла ошибка при выполнении скрипта (глобальная):\n")
        traceback.print_exc()
    finally:
        input("\nНажми Enter, чтобы закрыть окно...")


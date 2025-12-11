# Автогенерация статей и публикация в WordPress

Состав архива:

- `publisher_multisite.py` — основной скрипт.
- `config_multisite.py` — конфиг сайтов.
- `.env.example` — пример файла с ключом OpenAI.
- `functions_rankmath_snippet.php` — код для `functions.php` темы, чтобы Rank Math принимал meta title/description из API.

## 1. Установка зависимостей
Командная строка:
pip install openai==1.* requests python-dotenv pillow
```

## 2. Настрой .env

Скопируй `.env.example` в `.env` и впиши свой ключ:

```env
OPENAI_API_KEY=sk-....
```

## 3. Настрой config_multisite.py

Для каждого сайта:

- `wp_url` — точный URL WordPress (`https://домен`, либо временный домен/URL по IP).
- `username` — логин пользователя WP.
- `app_password` — пароль приложения (создаётся в профиле пользователя WP).
- `seo_plugin` — `"rankmath"` если используешь Rank Math.
- `default_category_id` — ID рубрики по умолчанию.

## 4. hosts для незапущенного домена

Если домен ещё не прикручен к NS, но WP уже доступен по IP:

1. В Windows открой от админа файл:

```
C:\Windows\System32\drivers\etc\hosts
```

2. Добавь строку:

```
46.62.229.237 bricker-project.com
```

3. В `config_multisite.py` укажи `wp_url="https://bricker-project.com"`.

## 5. Rank Math интеграция

Содержимое `functions_rankmath_snippet.php` вставь в `functions.php` активной темы
(либо подключи как отдельный плагин), чтобы:

- `rank_math_title` и `rank_math_description` принимались из REST API;
- данные из JSON-запроса сохранялись в реальные мета-поля Rank Math.

## 6. Запуск скрипта

1. Перейди в папку со скриптом:

```bash
cd publishing-text
```

2. Запусти:

```bash
python publisher_multisite.py
```

По умолчанию внизу `publisher_multisite.py` указано:

- тема: `"Регистрация в онлайн-казино: инструкция для новичка"`,
- сайт: `"atlasapp"`,
- `publish=False` — создаётся черновик (draft).

Чтобы публиковать сразу, поменяй на:

```python
generate_and_publish_for_site("atlasapp", topic, publish=True)
```

## 7. Поведение скрипта

- Генерирует статью через `gpt-5.1` по жёсткому SEO-промпту.
- Контролирует длину: целевой диапазон 1000–1500 слов,
  до 3 попыток; если минимум не достигнут, берёт самую длинную версию.
- Удаляет `<h1>` из контента, чтобы не было дубля заголовка.
- ЧПУ (`slug`) формирует **из темы** через транслитерацию, а не берёт из модели.
- Пытается сгенерировать обложку через `gpt-image-1` (если нет доступа — продолжит без картинки).
- Создаёт пост в WordPress через REST API, при наличии Rank Math пробрасывает SEO title/description.

Если что-то отвалится, в консоли будет полный traceback, окно не закрывается, пока не нажмёшь Enter.

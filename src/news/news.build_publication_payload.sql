CREATE OR REPLACE FUNCTION news.transliterate_ru_en(
    p_text text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
    v text := lower(coalesce(p_text, ''));
BEGIN
    -- normalize quotes
    v := replace(v, '’', '''');
    v := replace(v, '“', '"');
    v := replace(v, '”', '"');

    -- multi-character mappings first
    v := regexp_replace(v, 'щ', 'shch', 'g');
    v := regexp_replace(v, 'ш', 'sh', 'g');
    v := regexp_replace(v, 'ч', 'ch', 'g');
    v := regexp_replace(v, 'ж', 'zh', 'g');
    v := regexp_replace(v, 'ю', 'yu', 'g');
    v := regexp_replace(v, 'я', 'ya', 'g');
    v := regexp_replace(v, 'ё', 'e', 'g');
    v := regexp_replace(v, 'х', 'h', 'g');
    v := regexp_replace(v, 'ц', 'ts', 'g');

    -- single-character mappings
    v := regexp_replace(v, 'а', 'a', 'g');
    v := regexp_replace(v, 'б', 'b', 'g');
    v := regexp_replace(v, 'в', 'v', 'g');
    v := regexp_replace(v, 'г', 'g', 'g');
    v := regexp_replace(v, 'д', 'd', 'g');
    v := regexp_replace(v, 'е', 'e', 'g');
    v := regexp_replace(v, 'з', 'z', 'g');
    v := regexp_replace(v, 'и', 'i', 'g');
    v := regexp_replace(v, 'й', 'y', 'g');
    v := regexp_replace(v, 'к', 'k', 'g');
    v := regexp_replace(v, 'л', 'l', 'g');
    v := regexp_replace(v, 'м', 'm', 'g');
    v := regexp_replace(v, 'н', 'n', 'g');
    v := regexp_replace(v, 'о', 'o', 'g');
    v := regexp_replace(v, 'п', 'p', 'g');
    v := regexp_replace(v, 'р', 'r', 'g');
    v := regexp_replace(v, 'с', 's', 'g');
    v := regexp_replace(v, 'т', 't', 'g');
    v := regexp_replace(v, 'у', 'u', 'g');
    v := regexp_replace(v, 'ф', 'f', 'g');
    v := regexp_replace(v, 'ъ', '', 'g');
    v := regexp_replace(v, 'ы', 'y', 'g');
    v := regexp_replace(v, 'ь', '', 'g');
    v := regexp_replace(v, 'э', 'e', 'g');

    -- remove diacritics from any remaining characters
    v := unaccent(v);
    RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION news.build_publication_payload(
    p_article_payload jsonb,
    p_inbox_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_article        jsonb;
    v_body_html      text := '';
    v_bg             jsonb;
    v_source         text;
    v_source_url     text;
    v_block          jsonb;
    v_open_tag       text;
    v_close_tag      text;
    v_content_text   text;
    v_slug_fragment  text;
    v_slug           text;
    v_payload        jsonb;
    v_input_payload  jsonb;
    v_selected_header_number integer;
    v_header_candidate text;
    v_header text;
BEGIN
    -- Handle case when article_payload is stored as a JSON string instead of array/object
    IF p_article_payload IS NULL THEN
        RAISE EXCEPTION 'article_payload must be a JSON array or object produced by news_writer';
    END IF;

    IF jsonb_typeof(p_article_payload) = 'string' THEN
        -- Try to parse the string as JSONB
        BEGIN
            v_input_payload := (p_article_payload #>> '{}')::jsonb;
        EXCEPTION WHEN others THEN
            RAISE EXCEPTION 'article_payload is a string but cannot be parsed as JSON: %', p_article_payload;
        END;
    ELSE
        v_input_payload := p_article_payload;
    END IF;

    -- Support both array and object formats
    IF jsonb_typeof(v_input_payload) = 'array' THEN
        v_article := v_input_payload -> 0;
    ELSIF jsonb_typeof(v_input_payload) = 'object' THEN
        v_article := v_input_payload;
    ELSE
        RAISE EXCEPTION 'article_payload must be a JSON array or object, got type: %', jsonb_typeof(v_input_payload);
    END IF;

    IF p_inbox_id IS NULL THEN
        RAISE EXCEPTION 'inbox_id is required to build seo_name';
    END IF;

    IF v_article IS NULL THEN
        RAISE EXCEPTION 'article_payload is empty or invalid';
    END IF;

    IF v_article ->> 'header_1' IS NULL OR v_article ->> 'anons' IS NULL THEN
        RAISE EXCEPTION 'header_1/anons are required';
    END IF;

    BEGIN
        v_selected_header_number := NULL;
        IF v_article ? 'selected_header_number' THEN
            v_selected_header_number := (v_article ->> 'selected_header_number')::integer;
        END IF;
    EXCEPTION WHEN invalid_text_representation THEN
        v_selected_header_number := NULL;
    END;

    IF v_selected_header_number IS NULL THEN
        v_selected_header_number := 1;
    END IF;

    IF v_selected_header_number < 1 OR v_selected_header_number > 4 THEN
        v_selected_header_number := 1;
    END IF;

    CASE v_selected_header_number
        WHEN 2 THEN
            v_header_candidate := v_article ->> 'header_2';
        WHEN 3 THEN
            v_header_candidate := v_article ->> 'header_3';
        WHEN 4 THEN
            v_header_candidate := v_article ->> 'header_4';
        ELSE
            v_header_candidate := v_article ->> 'header_1';
    END CASE;

    v_header := coalesce(nullif(v_header_candidate, ''), v_article ->> 'header_1');

    IF v_header IS NULL OR btrim(v_header) = '' THEN
        RAISE EXCEPTION 'No valid header found for selected_header_number=%', v_selected_header_number;
    END IF;

    v_article := v_article
        || jsonb_build_object(
            'header', v_header,
            'selected_header_number', v_selected_header_number
        );

    -- основная «тушка» текста: последовательно paragraph_1, paragraph_2, paragraph_3 (опционально)
    -- paragraph_1
    v_block := v_article -> 'paragraph_1';
    IF v_block IS NULL OR jsonb_typeof(v_block) = 'null' THEN
        RAISE EXCEPTION 'paragraph_1 is required';
    END IF;
    v_open_tag  := v_block ->> 'opening_html_tag';
    v_close_tag := v_block ->> 'closing_html_tag';
    IF v_open_tag IS NULL OR v_close_tag IS NULL THEN
        RAISE EXCEPTION 'opening_html_tag/closing_html_tag must be provided for paragraph_1';
    END IF;
    IF jsonb_typeof(v_block -> 'content') = 'null' THEN
        -- пустой параграф с обязательными тегами: просто выводим пустой контейнер
        v_body_html := v_body_html || v_open_tag || v_close_tag;
    ELSIF jsonb_typeof(v_block -> 'content') = 'string' THEN
        v_content_text := news.clean_block_text(v_block ->> 'content');
        v_body_html := v_body_html || v_open_tag || v_content_text || v_close_tag;
    ELSIF jsonb_typeof(v_block -> 'content') = 'array' THEN
        v_body_html := v_body_html || v_open_tag;
        FOR v_content_text IN
            SELECT '<li>' || news.clean_block_text(value) || '</li>'
            FROM jsonb_array_elements_text(v_block -> 'content')
        LOOP
            v_body_html := v_body_html || v_content_text;
        END LOOP;
        v_body_html := v_body_html || v_close_tag;
    ELSE
        RAISE EXCEPTION 'Unsupported content type in paragraph_1';
    END IF;

    -- paragraph_2
    v_block := v_article -> 'paragraph_2';
    IF v_block IS NULL OR jsonb_typeof(v_block) = 'null' THEN
        RAISE EXCEPTION 'paragraph_2 is required';
    END IF;
    v_open_tag  := v_block ->> 'opening_html_tag';
    v_close_tag := v_block ->> 'closing_html_tag';
    IF v_open_tag IS NULL OR v_close_tag IS NULL THEN
        RAISE EXCEPTION 'opening_html_tag/closing_html_tag must be provided for paragraph_2';
    END IF;
    IF jsonb_typeof(v_block -> 'content') = 'null' THEN
        v_body_html := v_body_html || v_open_tag || v_close_tag;
    ELSIF jsonb_typeof(v_block -> 'content') = 'string' THEN
        v_content_text := news.clean_block_text(v_block ->> 'content');
        v_body_html := v_body_html || v_open_tag || v_content_text || v_close_tag;
    ELSIF jsonb_typeof(v_block -> 'content') = 'array' THEN
        v_body_html := v_body_html || v_open_tag;
        FOR v_content_text IN
            SELECT '<li>' || news.clean_block_text(value) || '</li>'
            FROM jsonb_array_elements_text(v_block -> 'content')
        LOOP
            v_body_html := v_body_html || v_content_text;
        END LOOP;
        v_body_html := v_body_html || v_close_tag;
    ELSE
        RAISE EXCEPTION 'Unsupported content type in paragraph_2';
    END IF;

    -- paragraph_3 (optional)
    v_block := v_article -> 'paragraph_3';
    IF v_block IS NOT NULL AND jsonb_typeof(v_block) <> 'null' THEN
        v_open_tag  := v_block ->> 'opening_html_tag';
        v_close_tag := v_block ->> 'closing_html_tag';
        IF v_open_tag IS NULL OR v_close_tag IS NULL THEN
            RAISE EXCEPTION 'opening_html_tag/closing_html_tag must be provided for paragraph_3 when present';
        END IF;
        IF jsonb_typeof(v_block -> 'content') = 'null' THEN
            v_body_html := v_body_html || v_open_tag || v_close_tag;
        ELSIF jsonb_typeof(v_block -> 'content') = 'string' THEN
            v_content_text := news.clean_block_text(v_block ->> 'content');
            v_body_html := v_body_html || v_open_tag || v_content_text || v_close_tag;
        ELSIF jsonb_typeof(v_block -> 'content') = 'array' THEN
            v_body_html := v_body_html || v_open_tag;
            FOR v_content_text IN
                SELECT '<li>' || news.clean_block_text(value) || '</li>'
                FROM jsonb_array_elements_text(v_block -> 'content')
            LOOP
                v_body_html := v_body_html || v_content_text;
            END LOOP;
            v_body_html := v_body_html || v_close_tag;
        ELSE
            RAISE EXCEPTION 'Unsupported content type in paragraph_3';
        END IF;
    END IF;

    -- бэкграунд
    IF v_article ? 'background' THEN
        v_bg := v_article -> 'background';

        IF jsonb_typeof(v_bg -> 'items') = 'array' THEN
            v_body_html := v_body_html || (v_bg ->> 'opening_html_tag');
            FOR v_content_text IN
                SELECT '<li>' || news.clean_block_text(
                    -- Remove list prefixes like "- ", "• ", etc.
                    regexp_replace(value, '^[\-\•\*]\s*', '')
                ) || '</li>'
                FROM jsonb_array_elements_text(v_bg -> 'items')
            LOOP
                v_body_html := v_body_html || v_content_text;
            END LOOP;
            v_body_html := v_body_html || (v_bg ->> 'closing_html_tag');
        END IF;
    END IF;

    -- источник
    v_source := v_article ->> 'source';
    IF v_source IS NOT NULL AND btrim(v_source) <> '' THEN
        v_body_html := v_body_html
                       || '<p style="text-align: right;"><em>Источник: '
                       || news.clean_block_text(v_source)
                       || '</em></p>';
    END IF;

    -- ссылка на оригинал из inbox.source_url (внизу новости отдельным абзацем)
    SELECT source_url INTO v_source_url
    FROM news.inbox
    WHERE id = p_inbox_id;

    IF v_source_url IS NOT NULL AND btrim(v_source_url) <> '' THEN
        v_body_html := v_body_html
                       || '<p><a href="' || v_source_url || '" target="_blank" rel="noopener nofollow">Оригинал материала</a></p>';
    END IF;

    -- slug: {id}-{первые 50 символов заголовка}
    v_slug_fragment := lower(public.unaccent(news.transliterate_ru_en(coalesce(v_header, ''))));
    v_slug_fragment := regexp_replace(v_slug_fragment, '[^0-9a-z]+', '-', 'g');
    v_slug_fragment := regexp_replace(v_slug_fragment, '-+', '-', 'g');
    v_slug_fragment := trim(both '-' from v_slug_fragment);
    IF length(v_slug_fragment) > 50 THEN
        v_slug_fragment := left(v_slug_fragment, 50);
        v_slug_fragment := regexp_replace(v_slug_fragment, '-+$', '');
    END IF;
    IF v_slug_fragment = '' THEN
        v_slug_fragment := p_inbox_id::text;
    END IF;
    v_slug := p_inbox_id::text || '-' || v_slug_fragment;

    v_payload := jsonb_build_object(
        'displayed_author_id', 131309230,
        'header', v_header,
        'anons_header', '',
        'anons', v_article ->> 'anons',
        'text', v_body_html,
        'sport_id', coalesce((v_article ->> 'sport_id')::int, 1),
        'anons_img', NULL,
        'publish_dt', NULL,
        'published', 0,
        'actual_dates', jsonb_build_array(),
        'seo_name', v_slug,
        'create_dt', to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS'),
        'locale', 1,
        'name_canonical', v_slug,
        'view_dt', NULL,
        'category_id', coalesce((v_article ->> 'category_id')::int, 9)
    );

    RETURN v_payload;
END;
$$;
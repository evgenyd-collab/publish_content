-- DROP FUNCTION news.sync_publication_from_inbox();

CREATE OR REPLACE FUNCTION news.sync_publication_from_inbox()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_payload jsonb;
    v_error   text;
BEGIN
    BEGIN
        IF NEW.article_payload IS NOT NULL THEN
            v_payload := news.build_publication_payload(NEW.article_payload::jsonb, NEW.id);

            INSERT INTO news.publications (inbox_id, article_payload, status, updated_at, last_error)
            VALUES (NEW.id, v_payload, 'ready_to_publish', timezone('utc', now()), NULL)
            ON CONFLICT (inbox_id) DO UPDATE
                SET article_payload = EXCLUDED.article_payload,
                    status          = 'ready_to_publish',
                    updated_at      = EXCLUDED.updated_at,
                    last_error      = NULL;
        END IF;

    EXCEPTION WHEN others THEN
        v_error := SQLERRM;

        INSERT INTO news.publications (inbox_id, article_payload, updated_at, last_error)
        VALUES (NEW.id, NULL, timezone('utc', now()), v_error)
        ON CONFLICT (inbox_id) DO UPDATE
            SET article_payload = NULL,
                updated_at      = timezone('utc', now()),
                last_error      = v_error;
    END;

    RETURN NEW;
END;
$function$
;

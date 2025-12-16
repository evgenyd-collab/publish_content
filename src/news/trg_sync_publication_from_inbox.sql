create trigger trg_sync_publication_from_inbox after
insert
    or
update
    of article_payload on
    news.inbox for each row when (NEW.article_payload is not null) execute function news.sync_publication_from_inbox();
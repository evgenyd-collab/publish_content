-- public.b_bonuses_api_enriched2 исходный текст

CREATE OR REPLACE VIEW public.b_bonuses_api_enriched2
AS SELECT b.id,
    l.locale_code,
    b.bookmaker_id,
    ((COALESCE(m.brand_name, m.seo_name)::text ||
        CASE
            WHEN m.id_cs IS NOT NULL THEN '|LC'::text
            ELSE ''::text
        END))::character varying(255) AS bookmaker,
    b.bonus_url_id,
    u.url,
        CASE
            WHEN b.terms IS NOT NULL THEN b.terms ->> 'bonus_name'::text
            ELSE NULL::text
        END AS name,
    b.terms ->> 'bonus_amount'::text AS amount,
    NULLIF((b.terms -> 'additional_rating_metrics'::text) ->> 'bonus_amount_number'::text, ''::text)::numeric AS amount_number,
    (b.terms -> 'additional_rating_metrics'::text) ->> 'bonus_amount_nominal'::text AS amount_nominal,
    (b.terms -> 'additional_metrics'::text) ->> 'minimum_odds'::text AS min_coefficient,
    COALESCE(b.raw_text_cleaned ->> 'text'::text, ( SELECT string_agg(arr.block ->> 'content'::text, '
'::text ORDER BY arr.ord) AS string_agg
           FROM jsonb_array_elements(b.raw_text_cleaned -> 'content_blocks'::text) WITH ORDINALITY arr(block, ord))) AS tc,
    (b.terms -> 'additional_metrics'::text) ->> 'deposit_requirement'::text AS min_deposit,
    ( SELECT to_char(sub.created_at, 'YYYY-MM-DD HH24:MI'::text) AS to_char
           FROM ( SELECT bh.created_at,
                    row_number() OVER (PARTITION BY bh.bonus_id ORDER BY bh.created_at DESC) AS row_order
                   FROM b_bonuses_history bh
                  WHERE bh.bonus_id = b.id AND bh.terms_diff IS NOT NULL) sub
          WHERE sub.row_order = 1) AS terms_update_date,
        CASE
            WHEN b.bonus_type::text = ANY (ARRAY['sportbonus_welcome'::character varying::text, 'casinobonus_welcome'::character varying::text, 'pokerbonus_welcome'::character varying::text, 'bingobonus_welcome'::character varying::text]) THEN 'Welcome'::character varying
            WHEN b.bonus_type::text = ANY (ARRAY['sportbonus_common'::character varying::text, 'casinobonus_common'::character varying::text, 'pokerbonus_common'::character varying::text, 'bingobonus_common'::character varying::text]) THEN 'Common'::character varying
            ELSE b.bonus_type
        END AS bonus_type,
        CASE
            WHEN (b.terms ->> 'domain'::text) = 'casino'::text THEN 'Casino'::text
            WHEN (b.terms ->> 'domain'::text) = 'poker'::text THEN 'Poker'::text
            WHEN (b.terms ->> 'domain'::text) = 'bingo'::text THEN 'Bingo'::text
            ELSE 'Sport'::text
        END AS domain,
        CASE
            WHEN (b.terms ->> 'domain'::text) = ANY (ARRAY['casino'::text, 'poker'::text, 'bingo'::text]) THEN NULL::text
            ELSE (b.terms -> 'bet_details'::text) ->> 'sport_type'::text
        END AS sport_type,
    b.terms ->> 'reward_type'::text AS reward_type,
    jsonb_set(jsonb_set(b.terms, '{diff_summary}'::text[], COALESCE(( WITH latest_changes AS (
                 SELECT bh.terms_diff -> 'changes'::text AS changes
                   FROM b_bonuses_history bh
                  WHERE bh.bonus_id = b.id AND bh.terms_diff IS NOT NULL
                  ORDER BY bh.created_at DESC
                 LIMIT 1
                )
         SELECT jsonb_build_array(( SELECT string_agg('#_'::text || change_text.value, '\n'::text) AS string_agg
                   FROM latest_changes latest_changes_1,
                    LATERAL jsonb_array_elements_text(latest_changes_1.changes) change_text(value))) AS jsonb_build_array
           FROM latest_changes
          WHERE latest_changes.changes IS NOT NULL), '[]'::jsonb)), '{promotion_essence}'::text[], to_jsonb(((b.terms ->> 'promotion_essence'::text) || '
CHANGES:
'::text) || COALESCE(( WITH latest_changes AS (
                 SELECT bh.terms_diff -> 'changes'::text AS changes
                   FROM b_bonuses_history bh
                  WHERE bh.bonus_id = b.id AND bh.terms_diff IS NOT NULL
                  ORDER BY bh.created_at DESC
                 LIMIT 1
                )
         SELECT string_agg('#_'::text || change_text.value, '\n'::text) AS string_agg
           FROM latest_changes,
            LATERAL jsonb_array_elements_text(latest_changes.changes) change_text(value)), ''::text))) AS terms,
    b.created,
    b.expiration_status,
    b.props,
    b.texts,
    b.expiration_date,
    b.next_check_date,
    b.updated_at,
    b.updated_by,
    b.last_check_date,
    lpad(((b.expiration_status ~~* '%active%'::text)::integer::text || (b.expiration_status !~~* '%check%'::text)::integer::text) || (b.expiration_status ~~* '%new%'::text)::integer::text, 3, '0'::text) AS bonus_age,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', sub.id, 'bonus_id', sub.bonus_id, 'status_type', sub.status_type, 'updated_at', sub.updated_at, 'updated_by', sub.updated_by, 'url_request_id', sub.url_request_id, 'comment', sub.comment, 'order', sub.row_order)), '[]'::jsonb) AS "coalesce"
           FROM ( SELECT s.id,
                    s.bonus_id,
                    st.code AS status_type,
                    s.updated_at,
                    s.updated_by,
                    s.url_request_id,
                    s.comment,
                    row_number() OVER (PARTITION BY s.bonus_id ORDER BY s.updated_at DESC) AS row_order
                   FROM b_status s
                     JOIN b_status_type st ON s.status_type_id = st.id
                  WHERE s.bonus_id = b.id) sub) AS status_history,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', sub.id, 'bookmaker_id', sub.bookmaker_id, 'url_request_id', sub.url_request_id, 'created_at', sub.created_at, 'updated_by', sub.updated_by, 'comment', sub.comment, 'terms_diff', sub.terms_diff, 'order', sub.row_order)), '[]'::jsonb) AS "coalesce"
           FROM ( SELECT bh.id,
                    bh.bookmaker_id,
                    bh.url_request_id,
                    bh.created_at,
                    bh.updated_by,
                    bh.comment,
                    bh.terms_diff,
                    row_number() OVER (PARTITION BY bh.bonus_id ORDER BY bh.created_at DESC) AS row_order
                   FROM b_bonuses_history bh
                  WHERE bh.bonus_id = b.id AND bh.terms_diff IS NOT NULL AND (bh.terms_diff ->> 'changed'::text) = 'true'::text) sub) AS terms_history,
    b.manual_url AS override_manual_url,
    b.manual_type_override AS override_manual_type,
    b.manual_terms AS override_manual_terms,
    b.manual_expiration AS override_manual_expiration,
    b.expiration_status = 'expired'::text AS is_expired,
    b.legalbet_url,
        CASE
            WHEN m.id_cs IS NOT NULL AND (b.terms ->> 'domain'::text) = 'casino'::text THEN jsonb_build_object('data', jsonb_build_object('type', 'bonus', 'attributes', jsonb_build_object('localeId', l.id, 'casinoId', m.id_cs, 'name', b.terms ->> 'bonus_name'::text, 'tAndC', regexp_replace(COALESCE(b.terms ->> 'promotion_essence'::text, ''::text), '\\s*CHANGES:.*$'::text, ''::text, 'gi'::text), 'achievement', '', 'promoCode', (b.terms -> 'legalcasino_payload_info'::text) ->> 'promoCode'::text, 'features', jsonb_build_array(jsonb_build_object('text',
            CASE
                WHEN lower(b.terms ->> 'is_welcome'::text) = 'common'::text THEN 'Format: For Existing Players'::text
                ELSE 'Format: Welcome Offer'::text
            END), jsonb_build_object('text',
            CASE
                WHEN ((b.terms -> 'legalcasino_payload_info'::text) ->> 'depositAmount'::text) IS NULL THEN 'No Deposit Free Spin Bonus'::text
                ELSE 'Minimum deposit: £'::text || ((b.terms -> 'legalcasino_payload_info'::text) ->> 'depositAmount'::text)
            END)), 'stepList', COALESCE(b.terms -> 'bonus_steps'::text, '[]'::jsonb), 'content', ('<h3>Important Limitations</h3><p>'::text || (( SELECT string_agg(t.detail, ' '::text) AS string_agg
               FROM jsonb_array_elements_text(COALESCE(b.terms -> 'other_details'::text, '[]'::jsonb)) t(detail)))) || '</p>'::text, 'offerType',
            CASE
                WHEN lower(b.terms ->> 'reward_type'::text) = 'free spins'::text THEN 'free_spins'::text
                WHEN (b.terms ->> 'reward_type'::text) = '%'::text THEN '%'::text
                ELSE 'cash'::text
            END, 'claimingMethod', (b.terms -> 'legalcasino_payload_info'::text) ->> 'claimingMethod'::text, 'playerStatus',
            CASE
                WHEN lower(b.terms ->> 'bonus_name'::text) ~* '(vip|high.?roller)'::text OR lower(b.terms ->> 'promotion_essence'::text) ~* '(vip|high.?roller)'::text THEN 'vip'::text
                WHEN lower(b.terms ->> 'is_welcome'::text) = 'common'::text THEN 'existing_players'::text
                ELSE 'welcome'::text
            END, 'verification', (b.terms -> 'legalcasino_payload_info'::text) ->> 'verification'::text, 'wager', (b.terms -> 'legalcasino_payload_info'::text) ->> 'wager'::text, 'frequency', (b.terms -> 'legalcasino_payload_info'::text) ->> 'frequency'::text, 'additional', COALESCE(b.terms ->> 'additional'::text, ''::text), 'expirationDate', b.terms ->> 'bonus_expiration_date'::text, 'freeSpins', NULLIF((b.terms -> 'casino_details'::text) ->> 'free_spins_max'::text, ''::text)::numeric, 'cash', NULLIF((b.terms -> 'legalcasino_payload_info'::text) ->> 'cash'::text, ''::text)::numeric, 'matchedPercent', NULLIF((b.terms -> 'legalcasino_payload_info'::text) ->> 'matchedPercent'::text, ''::text)::numeric, 'depositAmount', NULLIF((b.terms -> 'legalcasino_payload_info'::text) ->> 'depositAmount'::text, ''::text)::numeric, 'wagerAmount', NULLIF((b.terms -> 'bonus_playthrough_requirements'::text) ->> 'wager_amount'::text, ''::text)::numeric, 'createdAt', to_char(b.created, 'YYYY-MM-DD HH24:MI:SS'::text), 'updatedAt', to_char(b.updated_at, 'YYYY-MM-DD HH24:MI:SS'::text)) ||
            CASE
                WHEN (b.props ->> 'legalcasino_id'::text) IS NOT NULL THEN jsonb_build_object('id', (b.props ->> 'legalcasino_id'::text)::integer)
                ELSE '{}'::jsonb
            END))
            ELSE NULL::jsonb
        END AS legalcasino_payload
   FROM b_bonuses b
     LEFT JOIN bookmakers m ON b.bookmaker_id = m.id
     LEFT JOIN locales l ON m.loc = l.id
     LEFT JOIN urls u ON b.bonus_url_id = u.id
  WHERE (b.terms ->> 'bonus_name'::text) IS NOT NULL AND (b.expiration_status IS DISTINCT FROM 'expired'::text OR b.expiration_date >= (now() - '60 days'::interval));
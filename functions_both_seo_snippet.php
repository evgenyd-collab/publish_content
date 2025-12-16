<?php
/**
 * Поддержка Rank Math и Yoast SEO через REST API
 * Добавь этот код в functions.php активной темы
 */

// ============================================
// RANK MATH SEO
// ============================================
add_action('init', function() {
    $post_types = ['post', 'page']; // добавишь CPT, если нужно

    foreach ($post_types as $type) {
        // Rank Math Title
        register_post_meta(
            $type,
            'rank_math_title',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Rank Math Description
        register_post_meta(
            $type,
            'rank_math_description',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can('edit_posts');
                },
            ]
        );
    }
});

// Синхронизация Rank Math из REST API
add_action('rest_insert_post', 'atlas_sync_rank_math_meta_from_rest', 10, 3);
function atlas_sync_rank_math_meta_from_rest($post, $request, $creating) {
    $meta = $request->get_param('meta');
    if (!is_array($meta)) {
        return;
    }

    if (isset($meta['rank_math_title'])) {
        update_post_meta(
            $post->ID,
            'rank_math_title',
            sanitize_text_field($meta['rank_math_title'])
        );
    }

    if (isset($meta['rank_math_description'])) {
        update_post_meta(
            $post->ID,
            'rank_math_description',
            sanitize_textarea_field($meta['rank_math_description'])
        );
    }
}

// ============================================
// YOAST SEO
// ============================================
add_action('init', function() {
    $post_types = ['post', 'page']; // добавишь CPT, если нужно

    foreach ($post_types as $type) {
        // Yoast Title
        register_post_meta(
            $type,
            '_yoast_wpseo_title',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Yoast Description
        register_post_meta(
            $type,
            '_yoast_wpseo_metadesc',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can('edit_posts');
                },
            ]
        );
    }
});

// Синхронизация Yoast SEO из REST API
add_action('rest_insert_post', 'atlas_sync_yoast_meta_from_rest', 10, 3);
function atlas_sync_yoast_meta_from_rest($post, $request, $creating) {
    $meta = $request->get_param('meta');
    if (!is_array($meta)) {
        return;
    }

    if (isset($meta['_yoast_wpseo_title'])) {
        update_post_meta(
            $post->ID,
            '_yoast_wpseo_title',
            sanitize_text_field($meta['_yoast_wpseo_title'])
        );
    }

    if (isset($meta['_yoast_wpseo_metadesc'])) {
        update_post_meta(
            $post->ID,
            '_yoast_wpseo_metadesc',
            sanitize_textarea_field($meta['_yoast_wpseo_metadesc'])
        );
    }
}


// Yoast SEO: Разрешаем поля через REST API
add_action('init', function() {
    $post_types = ['post', 'page']; // добавишь CPT, если нужно

    foreach ($post_types as $type) {
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

// Синхронизируем meta из REST в реальные Yoast SEO поля
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


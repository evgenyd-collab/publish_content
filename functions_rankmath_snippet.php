// 1. Разрешаем Rank Math поля через REST API
add_action( 'init', function() {
    $post_types = [ 'post', 'page' ]; // добавишь CPT, если нужно

    foreach ( $post_types as $type ) {
        register_post_meta(
            $type,
            'rank_math_title',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can( 'edit_posts' );
                },
            ]
        );

        register_post_meta(
            $type,
            'rank_math_description',
            [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function() {
                    return current_user_can( 'edit_posts' );
                },
            ]
        );
    }
} );


// 2. Синхронизируем meta из REST в реальные Rank Math поля
add_action( 'rest_insert_post', 'atlas_sync_rank_math_meta_from_rest', 10, 3 );
function atlas_sync_rank_math_meta_from_rest( $post, $request, $creating ) {
    $meta = $request->get_param( 'meta' );
    if ( ! is_array( $meta ) ) {
        return;
    }

    if ( isset( $meta['rank_math_title'] ) ) {
        update_post_meta(
            $post->ID,
            'rank_math_title',
            sanitize_text_field( $meta['rank_math_title'] )
        );
    }

    if ( isset( $meta['rank_math_description'] ) ) {
        update_post_meta(
            $post->ID,
            'rank_math_description',
            sanitize_textarea_field( $meta['rank_math_description'] )
        );
    }
}

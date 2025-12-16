"""
Скрипт для определения установленного SEO плагина на WordPress сайте
"""
import requests
from config_multisite import SITES_CONFIG

def detect_seo_plugin(site_key: str) -> str:
    """
    Определяет, какой SEO плагин установлен на WordPress сайте
    
    Возвращает: 'rankmath', 'yoast', 'both', или 'none'
    """
    if site_key not in SITES_CONFIG:
        raise KeyError(f"Сайт '{site_key}' не найден в SITES_CONFIG")
    
    cfg = SITES_CONFIG[site_key]
    wp_url = cfg["wp_url"].rstrip("/")
    username = cfg["username"]
    app_password = cfg["app_password"]
    
    # Проверяем через WordPress REST API, какие плагины активны
    plugins_endpoint = f"{wp_url}/wp-json/wp/v2/plugins"
    
    try:
        resp = requests.get(
            plugins_endpoint,
            auth=(username, app_password),
            timeout=10
        )
        
        if resp.status_code == 200:
            plugins = resp.json()
            plugin_slugs = [p.get("plugin", "") for p in plugins if p.get("status") == "active"]
            
            has_rankmath = any("rank-math" in slug.lower() or "seo-by-rank-math" in slug.lower() for slug in plugin_slugs)
            has_yoast = any("yoast" in slug.lower() or "wordpress-seo" in slug.lower() for slug in plugin_slugs)
            
            if has_rankmath and has_yoast:
                return "both"
            elif has_rankmath:
                return "rankmath"
            elif has_yoast:
                return "yoast"
            else:
                return "none"
        else:
            print(f"[WARN] Не удалось получить список плагинов: {resp.status_code}")
            return "unknown"
            
    except Exception as e:
        print(f"[WARN] Ошибка при определении SEO плагина: {e}")
        return "unknown"

if __name__ == "__main__":
    # Тестирование
    for site_key in SITES_CONFIG.keys():
        plugin = detect_seo_plugin(site_key)
        print(f"{site_key}: {plugin}")


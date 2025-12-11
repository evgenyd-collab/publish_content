"""
GitHub Webhook Server для автоматического обновления репозитория
Запускает git pull при получении push события от GitHub
"""
from flask import Flask, request, jsonify
import subprocess
import os
import hmac
import hashlib
import time

app = Flask(__name__)

# Настройки
REPO_PATH = r"C:\texts"
BRANCH = "main"  # Основная ветка репозитория
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")  # Опциональный секрет для безопасности
PORT = 5000  # Порт для прослушивания
LOCK_FILE = os.path.join(REPO_PATH, ".git_update.lock")  # Файл блокировки


def verify_signature(payload_body, signature_header):
    """Проверка подписи webhook (если используется секрет)"""
    if not WEBHOOK_SECRET:
        return True  # Если секрет не установлен, пропускаем проверку
    
    if not signature_header:
        return False
    
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected_signature}", signature_header)


@app.route('/webhook', methods=['POST'])
def webhook():
    """Обработчик webhook от GitHub"""
    try:
        # Получить тип события
        event = request.headers.get('X-GitHub-Event')
        signature = request.headers.get('X-Hub-Signature-256', '')
        
        # Получить тело запроса
        payload = request.get_data()
        
        # Проверить подпись (если используется секрет)
        if not verify_signature(payload, signature):
            print("[WARNING] Invalid signature")
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Обработать только push события
        if event == 'push':
            print(f"[{__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Push event received")
            
            # Проверить, что push в нужную ветку
            data = request.get_json()
            ref = data.get('ref', '')
            
            if f'refs/heads/{BRANCH}' in ref:
                print(f"Updating branch: {BRANCH}")
                
                # Проверить блокировку (чтобы не конфликтовать с PowerShell скриптом)
                if os.path.exists(LOCK_FILE):
                    lock_age = os.path.getmtime(LOCK_FILE)
                    current_time = time.time()
                    if (current_time - lock_age) < 300:  # Блокировка действительна 5 минут
                        print("Update in progress (lock file exists), skipping...")
                        return jsonify({
                            'status': 'skipped',
                            'message': 'Update already in progress'
                        }), 200
                    else:
                        # Старая блокировка, удаляем
                        try:
                            os.remove(LOCK_FILE)
                        except:
                            pass
                
                # Создать блокировку
                try:
                    with open(LOCK_FILE, 'w') as f:
                        f.write(str(os.getpid()))
                except Exception as e:
                    print(f"Cannot create lock file: {e}")
                    return jsonify({
                        'status': 'error',
                        'message': 'Cannot create lock file'
                    }), 500
                
                try:
                    # Перейти в директорию репозитория
                    os.chdir(REPO_PATH)
                    
                    # Сохранить локальные изменения (если есть)
                    subprocess.run(['git', 'stash'], capture_output=True)
                    
                    # Выполнить git pull
                    result = subprocess.run(
                        ['git', 'pull', 'origin', BRANCH],
                        capture_output=True,
                        text=True,
                        encoding='utf-8'
                    )
                    
                    if result.returncode == 0:
                        print(f"Update successful: {result.stdout}")
                        return jsonify({
                            'status': 'success',
                            'message': 'Repository updated successfully',
                            'output': result.stdout
                        }), 200
                    else:
                        print(f"Update failed: {result.stderr}")
                        return jsonify({
                            'status': 'error',
                            'message': 'Git pull failed',
                            'error': result.stderr
                        }), 500
                        
                except Exception as e:
                    print(f"Error during update: {str(e)}")
                    return jsonify({
                        'status': 'error',
                        'message': str(e)
                    }), 500
                finally:
                    # Удалить блокировку
                    try:
                        if os.path.exists(LOCK_FILE):
                            os.remove(LOCK_FILE)
                    except:
                        pass
            else:
                print(f"Ignoring push to branch: {ref}")
                return jsonify({'status': 'ignored', 'message': 'Not the target branch'}), 200
        else:
            print(f"Ignoring event: {event}")
            return jsonify({'status': 'ignored', 'message': f'Event {event} ignored'}), 200
            
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Проверка работоспособности сервера"""
    return jsonify({
        'status': 'ok',
        'repo_path': REPO_PATH,
        'branch': BRANCH
    }), 200


@app.route('/', methods=['GET'])
def index():
    """Главная страница"""
    return jsonify({
        'service': 'GitHub Webhook Server',
        'endpoints': {
            '/webhook': 'POST - GitHub webhook endpoint',
            '/health': 'GET - Health check'
        }
    }), 200


if __name__ == '__main__':
    print("=" * 50)
    print("GitHub Webhook Server")
    print("=" * 50)
    print(f"Repository path: {REPO_PATH}")
    print(f"Branch: {BRANCH}")
    print(f"Port: {PORT}")
    print(f"Webhook URL: http://your-ip:{PORT}/webhook")
    print("=" * 50)
    print("Server starting...")
    print("Press Ctrl+C to stop")
    print()
    
    # Запустить сервер
    # ВАЖНО: Для работы извне используйте host='0.0.0.0'
    # Для локального тестирования можно использовать host='127.0.0.1'
    app.run(host='0.0.0.0', port=PORT, debug=False)


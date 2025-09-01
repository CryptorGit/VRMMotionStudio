from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import logging
import signal
import threading


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CORSRequestHandler(SimpleHTTPRequestHandler):
    """HTTP リクエストを処理し、必要な CORS ヘッダを付与するハンドラ"""

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/hello':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {'message': 'Hello from Python'}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            super().do_GET()


def run(port: int = 8000):
    """HTTP サーバを起動する

    Parameters
    ----------
    port : int, optional
        起動するポート番号 (default 8000)
    """

    server_address = ('', port)
    with ThreadingHTTPServer(server_address, CORSRequestHandler) as httpd:
        def handle_signal(signum, frame):
            logger.info('Shutting down server')
            threading.Thread(target=httpd.shutdown).start()

        signal.signal(signal.SIGINT, handle_signal)
        signal.signal(signal.SIGTERM, handle_signal)

        logger.info('Python backend running on http://localhost:%d', port)
        try:
            httpd.serve_forever()
        except Exception:
            logger.exception('Server stopped unexpectedly')
            httpd.shutdown()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000, help='ポート番号')
    args = parser.parse_args()

    run(port=args.port)


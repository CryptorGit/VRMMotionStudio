from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json


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


def run():
    server_address = ('', 8000)
    httpd = ThreadingHTTPServer(server_address, CORSRequestHandler)
    print('Python backend running on http://localhost:8000')
    httpd.serve_forever()


if __name__ == '__main__':
    run()


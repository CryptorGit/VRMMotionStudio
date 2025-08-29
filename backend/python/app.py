from http.server import HTTPServer, SimpleHTTPRequestHandler


def run():
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print('Python backend running on http://localhost:8000')
    httpd.serve_forever()


if __name__ == '__main__':
    run()

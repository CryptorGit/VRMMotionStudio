import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
CORS(app, origins=origins)


@app.route("/api/hello", methods=["GET"])
def hello():
    """挨拶メッセージを返すサンプルエンドポイント"""
    return jsonify({"message": "Hello from Python"})


def run(port: int = 8000):
    """Flask サーバを起動する"""
    logger.info("Python backend running on http://localhost:%d", port)
    app.run(host="0.0.0.0", port=port)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000, help="ポート番号")
    args = parser.parse_args()

    run(port=args.port)

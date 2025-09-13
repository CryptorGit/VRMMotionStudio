import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

allowed_origins = os.getenv("ALLOWED_ORIGINS")
if not allowed_origins:
    logger.error("環境変数 ALLOWED_ORIGINS が設定されていません。")
    raise RuntimeError("ALLOWED_ORIGINS is required")

origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
if origins:
    CORS(app, origins=origins)
else:
    logger.warning("ALLOWED_ORIGINS が空です。CORS を無効化します。")


@app.route("/api/hello", methods=["GET"])
def hello():
    """挨拶メッセージを返すサンプルエンドポイント"""
    return jsonify({"message": "Hello from Python"})


@app.route("/api/log", methods=["POST"])
def log_endpoint():
    """フロントエンドからのログを受け取り、サーバの標準出力へ出力する"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        # 重要なイベント名を先頭にして見やすく
        event = data.get("event", "client-log")
        logger.info("[FE] %s %s", event, data)
        return ("", 204)
    except Exception as e:
        logger.exception("/api/log failed: %s", e)
        return jsonify({"ok": False}), 500


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

# Python 補助サービス (Flask)

簡易な API を提供する任意コンポーネントです。開発用途やログ受け取りに利用できます。

## セットアップ
```powershell
pip install -r requirements.txt
```

## 起動
```powershell
# 必要に応じて環境変数を設定
$env:ALLOWED_ORIGINS="http://localhost:5173"
python .\app.py --port 8000
```

エンドポイント:
- `GET /api/hello` … 確認用
- `POST /api/log` … JSON ログを受け取り出力

CORS は `ALLOWED_ORIGINS` に従います。
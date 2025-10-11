# フロントエンド用 Dockerfile
FROM node:22-alpine

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm install

# ソースコードをコピー
COPY . .

# Viteの開発サーバーをポート5174で起動
EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

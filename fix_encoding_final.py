#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import codecs
import re

file_path = r'C:\Users\crypt\source\repos\CryptorGit\MokuMokuDanceWeb\frontend\src\components\ThreeViewer.vue'

# 最終的な文字化けパターンと正しい文字列のマッピング
replacements = [
    # 既に置換されたものを含む完全なリスト
    ('允E��戻す', '元に戻す'),
    ('めE��直ぁE', 'やり直し'),
    ('されてぁE��せん', 'されていません'),
    ('允E��戻す', '元に戻す'),
    ('、E0FPS', '、60FPS'),
    ('-60dBめE、EdBめE', '-60dBから0dBまで'),
    ('惁E��を取征E', '情報を取得'),
    ('されていE��MIME', 'されているMIME'),
    ('完亁E��待機', '完了、待機'),
    ('デE��ォルト', 'デフォルト'),
    ('されてぁE��モデル', 'されているモデル'),
    ('E��択された', '選択された'),
    ('動かしてぁE��', '動かしている'),
    ('以夁E', '以外'),
    ('渁E場合', 'された場合'),
    ('しなぁE', 'しない'),
    ('誤差冁E��', '誤差内なら'),
    ('試衁E', '試みる'),
    ('ヘルパの/', 'ヘルパー/'),
    ('書きい', '書き出し'),
]

# ファイルを読み込み
with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 置換を実行
for old, new in replacements:
    content = content.replace(old, new)

# ファイルに書き込み
with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"最終修正完了: {len(replacements)} 個のパターンを置換しました")

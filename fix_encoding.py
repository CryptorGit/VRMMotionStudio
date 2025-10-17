#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import codecs

file_path = r'C:\Users\crypt\source\repos\CryptorGit\MokuMokuDanceWeb\frontend\src\components\ThreeViewer.vue'

# 追加の文字化けパターンと正しい文字列のマッピング
replacements = [
    ('（E', '）'),
    ('�E', 'の'),
    ('ヘルパ�E', 'ヘルパー'),
    ('作（E', '作成、'),
    ('バチE��グラウンド', 'バックグラウンド'),
    ('琁E��', '理'),
    ('処琁E', '処理'),
    ('チE�Eタ', 'データ'),
    ('デシベル（E', 'デシベル）'),
    ('待機）edia', '待機）Media'),
    ('追ぁE��く', '追いつく'),
    ('よぁE��', 'ように'),
    ('固有�E', '固有の'),
    ('征E��', '待機'),
    ('間�E征E��', '間を待機'),
    ('進捗表示（E0%ごと', '進捗表示（10%ごと'),
    ('一度trueになったらtrueのまま', '一度trueになったらtrueのまま'),
    ('念のため', '念のため'),
    ('値をVRMマテリアルから取得（ユーザーがまだ変更していない場合�Eみ', '値をVRMマテリアルから取得（ユーザーがまだ変更していない場合のみ'),
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

print(f"修正完了: {len(replacements)} 個のパターンを置換しました")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

file_path = r'frontend\src\components\ThreeViewer.vue'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix PNG description
content = content.replace("description: 'PNG画像,", "description: 'PNG画像',")

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Fixed PNG description strings")

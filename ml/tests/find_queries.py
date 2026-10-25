import os
import re

for root, dirs, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fp:
                lines = fp.readlines()
            for idx, line in enumerate(lines):
                if re.search(r'\.(eq|in|insert|update|delete)\(', line) and ('patient' in line or 'id' in line):
                    print(f"{path}:{idx+1}: {line.strip()}")

#!/usr/bin/env python3
"""Build GIO PERFORMANCE into a single self-contained HTML file.
   index.html          -> full document (GitHub Pages / any static host)
   dist/artifact.html  -> same page without the <!doctype>/<html> wrapper (claude.ai Artifact)"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
r = lambda n: (src / n).read_text(encoding='utf-8')
head = r('head.html') + '<style>\n' + r('style.css') + '</style>\n'
body = r('body.html') + '<script>\n' + r('data.js') + '\n</script>\n<script>\n' + r('app.js') + '\n</script>\n'
full = ('<!doctype html>\n<html lang="ka">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + '</head>\n<body>\n' + body + '</body>\n</html>\n')
(root / 'index.html').write_text(full, encoding='utf-8')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'artifact.html').write_text(head + body, encoding='utf-8')
print('built', len(full)//1024, 'KB')

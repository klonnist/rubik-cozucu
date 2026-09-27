"""Yerel geliştirme için basit statik sunucu; tüm yanıtlara no-store ekler.

Tarayıcı önbelleği yüzünden düzenlenen dosyaların bayat sürümlerinin sunulmasını
önlemek için kullanılır (yalnızca yerel önizleme amaçlıdır, GitHub Pages'e
dahil edilmez).
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    http.server.test(HandlerClass=NoCacheHandler, port=port)

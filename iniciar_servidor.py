from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, webbrowser
BASE=Path(__file__).resolve().parent
os.chdir(BASE)
url="http://localhost:8000"
print(f"Visor disponible en {url}")
webbrowser.open(url)
ThreadingHTTPServer(("localhost",8000),SimpleHTTPRequestHandler).serve_forever()

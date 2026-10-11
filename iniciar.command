#!/bin/bash
# Doble clic para arrancar la app en local (Mac). Ctrl+C para parar.
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "En el Mac:   http://localhost:8000"
[ -n "$IP" ] && echo "En el móvil: http://$IP:8000  (misma WiFi)"
open "http://localhost:8000"
python3 -m http.server 8000

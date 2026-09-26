#!/bin/bash
# Fallback if double-clicking index.html misbehaves: serve this folder on localhost.
cd "$(dirname "$0")" && python3 -m http.server 8765 & sleep 1 && open http://localhost:8765/index.html

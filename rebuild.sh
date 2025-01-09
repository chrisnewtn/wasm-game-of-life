#!/bin/bash
set -e
wasm-pack build -t web
miniserve . --index "index.html" --header "Cache-Control:no-cache" -p 8080

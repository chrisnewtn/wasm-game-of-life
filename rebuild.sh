#!/bin/bash
set -e
wasm-pack build -t web -d public/pkg
miniserve public --index "index.html" --header "Cache-Control:no-cache" -p 8080

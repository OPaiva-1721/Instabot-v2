#!/bin/sh
if [ -n "$VITE_API_URL" ]; then
  sed -i "s|__RUNTIME_API_URL__|${VITE_API_URL}|g" /app/dist/index.html
fi
npx serve dist -l "${PORT:-3000}"

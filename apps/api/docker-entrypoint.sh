#!/bin/sh
set -e
echo "Running migrations..."
node /app/node_modules/typeorm/cli.js migration:run -d /app/apps/api/dist/src/database/data-source.js
echo "Starting app..."
exec node /app/apps/api/dist/src/main.js
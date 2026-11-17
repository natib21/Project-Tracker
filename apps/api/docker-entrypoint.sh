#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/apps/api
npm run migration:run

echo "Starting application..."
npm run start

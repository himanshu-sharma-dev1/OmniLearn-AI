#!/bin/sh
set -e
echo "Initializing database..."
flask init-db
echo "Database initialized."
echo "Starting Flask server..."
exec flask run --host=0.0.0.0 --port=5001
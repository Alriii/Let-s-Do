#!/bin/sh
set -e

# Support Render dynamic port assignment ($PORT)
if [ -n "$PORT" ]; then
    sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/ports.conf
    sed -i "s/:80/:$PORT/g" /etc/apache2/sites-available/000-default.conf
fi

# Discover packages and cache config if in production
php artisan package:discover --ansi || true

if [ -n "$APP_KEY" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Execute main container process
exec "$@"

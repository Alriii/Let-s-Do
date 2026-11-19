#!/bin/sh
set -e

# set port
if [ -n "$PORT" ]; then
    sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/ports.conf
    sed -i "s/:80/:$PORT/g" /etc/apache2/sites-available/000-default.conf
fi

# discover packages
php artisan package:discover --ansi || true

# run migrations
php artisan migrate --force --no-interaction

# storage link
php artisan storage:link || true

if [ -n "$APP_KEY" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# start scheduler
php artisan schedule:work > /dev/null 2>&1 &

# start server
exec "$@"

# -----------------------------------------------------------------------------
# Production Dockerfile for Laravel Backend (Render Deployment)
# -----------------------------------------------------------------------------
FROM php:8.3-apache

# Install required system packages and PostgreSQL development libraries
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    unzip \
    git \
    curl \
    && docker-php-ext-install -j$(nproc) \
    pdo_pgsql \
    pgsql \
    zip \
    bcmath \
    intl \
    opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Point Apache DocumentRoot to Laravel's public directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Enable Apache mod_rewrite for Laravel API routing
RUN a2enmod rewrite

# Copy Composer binary from official Composer image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy project files
COPY . /var/www/html

# Ensure entrypoint script is executable and has Unix line endings
RUN sed -i 's/\r$//' /var/www/html/docker/entrypoint.sh \
    && chmod +x /var/www/html/docker/entrypoint.sh

# Install production dependencies without dev tools
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set proper permissions for Laravel writable directories
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose default HTTP port
EXPOSE 80

# Configure entrypoint and startup command
ENTRYPOINT ["/var/www/html/docker/entrypoint.sh"]
CMD ["apache2-foreground"]

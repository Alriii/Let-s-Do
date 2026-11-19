<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// weather service using open-meteo
class WeatherService
{
    private const DEFAULT_LAT = 14.5995;
    private const DEFAULT_LON = 120.9842;
    private const DEFAULT_CITY = 'Metro Manila, Philippines';
    private const DEFAULT_TIMEZONE = 'Asia/Manila';

    // weather code mapping to labels
    private const WMO_CODES = [
        0  => ['label' => 'Clear sky',              'emoji' => '☀️'],
        1  => ['label' => 'Mainly clear',            'emoji' => '🌤️'],
        2  => ['label' => 'Partly cloudy',           'emoji' => '⛅'],
        3  => ['label' => 'Overcast',                'emoji' => '☁️'],
        45 => ['label' => 'Foggy',                   'emoji' => '🌫️'],
        48 => ['label' => 'Icy fog',                 'emoji' => '🌫️'],
        51 => ['label' => 'Light drizzle',           'emoji' => '🌦️'],
        53 => ['label' => 'Drizzle',                 'emoji' => '🌦️'],
        55 => ['label' => 'Heavy drizzle',           'emoji' => '🌦️'],
        61 => ['label' => 'Slight rain',             'emoji' => '🌧️'],
        63 => ['label' => 'Rain',                    'emoji' => '🌧️'],
        65 => ['label' => 'Heavy rain',              'emoji' => '🌧️'],
        71 => ['label' => 'Slight snow',             'emoji' => '🌨️'],
        73 => ['label' => 'Snow',                    'emoji' => '🌨️'],
        75 => ['label' => 'Heavy snow',              'emoji' => '🌨️'],
        80 => ['label' => 'Slight showers',          'emoji' => '🌦️'],
        81 => ['label' => 'Showers',                 'emoji' => '🌦️'],
        82 => ['label' => 'Violent showers',         'emoji' => '⛈️'],
        95 => ['label' => 'Thunderstorm',            'emoji' => '⛈️'],
        96 => ['label' => 'Thunderstorm with hail',  'emoji' => '⛈️'],
        99 => ['label' => 'Thunderstorm with hail',  'emoji' => '⛈️'],
    ];

    // geocode city name to lat/lon
    public function geocode(string $query): ?array
    {
        $clean = trim(preg_replace('/[^\w\s\-\,]/u', '', $query));
        if (strlen($clean) < 2) {
            return null;
        }

        $cacheKey = 'geocode:' . md5(strtolower($clean));

        return Cache::remember($cacheKey, 86400 * 7, function () use ($clean) {
            try {
                $url = 'https://geocoding-api.open-meteo.com/v1/search?' . http_build_query([
                    'name'     => $clean,
                    'count'    => 1,
                    'language' => 'en',
                    'format'   => 'json',
                ]);

                $res = Http::timeout(6)->get($url);
                if (! $res->successful()) {
                    return null;
                }

                $first = $res->json('results.0');
                if (! $first) {
                    return null;
                }

                $name    = $first['name'] ?? $clean;
                $country = $first['country'] ?? '';
                $admin   = $first['admin1'] ?? '';
                $display = trim("{$name}" . ($admin ? ", {$admin}" : '') . ($country ? ", {$country}" : ''));

                return [
                    'name'      => $name,
                    'latitude'  => (float) $first['latitude'],
                    'longitude' => (float) $first['longitude'],
                    'country'   => $country,
                    'timezone'  => $first['timezone'] ?? 'auto',
                    'display'   => $display,
                ];
            } catch (\Throwable $e) {
                Log::warning("WeatherService::geocode error: {$e->getMessage()}");
                return null;
            }
        });
    }

    // get weather for lat/lon
    public function getWeather(
        ?float $lat = null,
        ?float $lon = null,
        string $city = self::DEFAULT_CITY,
        string $timezone = self::DEFAULT_TIMEZONE,
    ): ?array {
        $lat = $lat ?? self::DEFAULT_LAT;
        $lon = $lon ?? self::DEFAULT_LON;

        $cacheKey = "weather:{$lat}:{$lon}";

        return Cache::remember($cacheKey, 1800, function () use ($lat, $lon, $city, $timezone) {
            return $this->fetch($lat, $lon, $city, $timezone);
        });
    }

    // get weather by city name
    public function getWeatherForNamedPlace(string $place): ?array
    {
        $geo = $this->geocode($place);
        if (! $geo) {
            return null;
        }

        return $this->getWeather($geo['latitude'], $geo['longitude'], $geo['display'], $geo['timezone']);
    }

    // get weather text for prompt
    public function getPromptContextForMessage(?string $userMessage = null): string
    {
        if ($userMessage) {
            $extractedPlace = $this->extractLocationFromText($userMessage);
            if ($extractedPlace) {
                $geo = $this->geocode($extractedPlace);
                if ($geo) {
                    $weather = $this->getWeather($geo['latitude'], $geo['longitude'], $geo['display'], $geo['timezone']);
                    if ($weather) {
                        return $this->formatWeatherContext($weather, "RADAR DETECTED FOR REQUESTED LOCATION ({$geo['display']})");
                    }
                }
            }
        }

        // default to metro manila
        $defaultWeather = $this->getWeather();
        $defaultContext = $defaultWeather
            ? $this->formatWeatherContext($defaultWeather, "LOCAL WEATHER RADAR (Metro Manila, Philippines)")
            : "Weather data is currently updating.";

        return $defaultContext . "\nNOTE: Lumi's weather radar is worldwide. If the user asks about weather anywhere in the world, use your knowledge and remind them you can check any place globally.";
    }

    // find location from user message
    private function extractLocationFromText(string $text): ?string
    {
        // check patterns like "weather in Cebu"
        if (preg_match('/\b(?:weather|rain|raining|forecast|sunny|cloudy|temperature|climate)\s+(?:in|at|for|around)\s+([a-zA-Z\s]{2,30}?)(?:\?|\.|\!|\band\b|\btoday\b|\btomorrow\b|$)/i', $text, $matches)) {
            return trim($matches[1]);
        }

        if (preg_match('/\b(?:in|at)\s+([a-zA-Z\s]{2,25})\s+(?:weather|forecast|schedule)\b/i', $text, $matches)) {
            return trim($matches[1]);
        }

        // check list of cities
        $places = [
            'Baguio', 'Cebu', 'Davao', 'Tagaytay', 'Iloilo', 'Bacolod', 'Angeles', 'Subic',
            'Palawan', 'Boracay', 'Siargao', 'Zamboanga', 'Cagayan de Oro', 'Batangas',
            'Laguna', 'Cavite', 'Pampanga', 'Bicol', 'Naga', 'Legazpi', 'Vigan',
            'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'Manila',
            'Tokyo', 'Singapore', 'London', 'Paris', 'New York', 'Seoul', 'Sydney', 'Bangkok', 'Hong Kong'
        ];

        foreach ($places as $place) {
            if (preg_match('/\b' . preg_quote($place, '/') . '\b/i', $text)) {
                return $place;
            }
        }

        return null;
    }

    // format weather text
    private function formatWeatherContext(array $data, string $header): string
    {
        $cur = $data['current'];
        $lines = [
            "{$header} (as of {$cur['time']}):",
            "  Current: {$cur['emoji']} {$cur['label']}, {$cur['temperature']}°C, feels like {$cur['apparent_temperature']}°C, humidity {$cur['humidity']}%, wind {$cur['wind_speed']} km/h.",
        ];

        if (! empty($data['hourly_today'])) {
            $peaks = $this->hourlyPeaks($data['hourly_today']);
            $lines[] = "  Today's peak: {$peaks['max_temp']}°C at {$peaks['max_hour']}, lowest: {$peaks['min_temp']}°C at {$peaks['min_hour']}.";
            if ($peaks['rain_hours']) {
                $lines[] = "  Rain/showers likely around: {$peaks['rain_hours']}.";
            }
        }

        if (! empty($data['daily'])) {
            $lines[] = "  3-day outlook:";
            foreach (array_slice($data['daily'], 0, 3) as $day) {
                $lines[] = "    {$day['date']} ({$day['weekday']}): {$day['emoji']} {$day['label']}, {$day['min']}–{$day['max']}°C, rain {$day['precipitation_sum']}mm.";
            }
        }

        return implode("\n", $lines);
    }

    // api call to open-meteo
    private function fetch(float $lat, float $lon, string $city, string $timezone): ?array
    {
        $url = 'https://api.open-meteo.com/v1/forecast?' . http_build_query([
            'latitude'      => $lat,
            'longitude'     => $lon,
            'timezone'      => $timezone,
            'current'       => 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
            'hourly'        => 'temperature_2m,weather_code,precipitation_probability',
            'daily'         => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
            'forecast_days' => 4,
        ]);

        try {
            $response = Http::timeout(10)->get($url);

            if (! $response->successful()) {
                Log::warning("WeatherService: HTTP {$response->status()} from Open-Meteo.");
                return null;
            }

            $raw = $response->json();
        } catch (\Throwable $e) {
            Log::warning("WeatherService: {$e->getMessage()}");
            return null;
        }

        // Current conditions
        $cur = $raw['current'] ?? [];
        $wmoCode = (int) ($cur['weather_code'] ?? 0);
        $wmo = self::WMO_CODES[$wmoCode] ?? ['label' => 'Unknown', 'emoji' => '🌡️'];
        $isDay = (bool) ($cur['is_day'] ?? 1);

        if ($wmoCode === 0 && ! $isDay) {
            $wmo['emoji'] = '🌙';
        }

        $current = [
            'time'                 => substr($cur['time'] ?? '', 11, 5),
            'temperature'          => round($cur['temperature_2m'] ?? 0, 1),
            'apparent_temperature' => round($cur['apparent_temperature'] ?? 0, 1),
            'humidity'             => $cur['relative_humidity_2m'] ?? null,
            'wind_speed'           => round($cur['wind_speed_10m'] ?? 0, 1),
            'weather_code'         => $wmoCode,
            'label'                => $wmo['label'],
            'emoji'                => $wmo['emoji'],
            'is_day'               => $isDay,
        ];

        // Hourly for today (first 24 entries)
        $hourly = $raw['hourly'] ?? [];
        $hourlyToday = [];
        for ($i = 0; $i < 24; $i++) {
            $time = $hourly['time'][$i] ?? null;
            if (! $time) {
                break;
            }
            $hCode = (int) ($hourly['weather_code'][$i] ?? 0);
            $hWmo  = self::WMO_CODES[$hCode] ?? ['label' => 'Unknown', 'emoji' => '🌡️'];
            $hourlyToday[] = [
                'time'                   => substr($time, 11, 5),
                'temperature'            => round($hourly['temperature_2m'][$i] ?? 0, 1),
                'precipitation_chance'   => $hourly['precipitation_probability'][$i] ?? 0,
                'weather_code'           => $hCode,
                'label'                  => $hWmo['label'],
                'emoji'                  => $hWmo['emoji'],
            ];
        }

        // Daily forecast (skip today index 0)
        $daily = $raw['daily'] ?? [];
        $dailyForecast = [];
        for ($i = 1; $i <= 3; $i++) {
            $date = $daily['dates'][$i] ?? ($daily['time'][$i] ?? null);
            if (! $date) {
                break;
            }
            $dCode = (int) ($daily['weather_code'][$i] ?? 0);
            $dWmo  = self::WMO_CODES[$dCode] ?? ['label' => 'Unknown', 'emoji' => '🌡️'];
            $carbon = \Carbon\Carbon::parse($date);
            $dailyForecast[] = [
                'date'               => $date,
                'weekday'            => $carbon->format('l'),
                'max'                => round($daily['temperature_2m_max'][$i] ?? 0, 1),
                'min'                => round($daily['temperature_2m_min'][$i] ?? 0, 1),
                'precipitation_sum'  => round($daily['precipitation_sum'][$i] ?? 0, 1),
                'weather_code'       => $dCode,
                'label'              => $dWmo['label'],
                'emoji'              => $dWmo['emoji'],
            ];
        }

        return [
            'city'         => $city,
            'latitude'     => $lat,
            'longitude'    => $lon,
            'current'      => $current,
            'hourly_today' => $hourlyToday,
            'daily'        => $dailyForecast,
        ];
    }

    private function hourlyPeaks(array $hours): array
    {
        $maxTemp = -999; $minTemp = 999;
        $maxHour = ''; $minHour = '';
        $rainHours = [];

        foreach ($hours as $h) {
            if ($h['temperature'] > $maxTemp) {
                $maxTemp = $h['temperature'];
                $maxHour = $h['time'];
            }
            if ($h['temperature'] < $minTemp) {
                $minTemp = $h['temperature'];
                $minHour = $h['time'];
            }
            if (($h['precipitation_chance'] ?? 0) >= 50) {
                $rainHours[] = $h['time'];
            }
        }

        return [
            'max_temp'   => $maxTemp,
            'max_hour'   => $maxHour,
            'min_temp'   => $minTemp,
            'min_hour'   => $minHour,
            'rain_hours' => empty($rainHours) ? null : implode(', ', array_slice($rainHours, 0, 4)),
        ];
    }
}

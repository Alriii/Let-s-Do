<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches current weather + 7-day forecast from Open-Meteo (no API key required).
 * Default coordinates: Metro Manila, Philippines (14.5995°N, 120.9842°E).
 *
 * Data is cached for 30 minutes to avoid unnecessary API calls.
 */
class WeatherService
{
    /** Metro Manila, Philippines */
    private const DEFAULT_LAT = 14.5995;
    private const DEFAULT_LON = 120.9842;
    private const DEFAULT_CITY = 'Metro Manila';
    private const DEFAULT_TIMEZONE = 'Asia/Manila';

    /**
     * WMO Weather Interpretation Codes → human-readable description + emoji.
     * https://open-meteo.com/en/docs#weathervariables
     */
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

    /**
     * Fetch current + 3-day forecast for the given city coordinates.
     * Falls back to Metro Manila if no coordinates supplied.
     *
     * @param float|null $lat   Latitude  (e.g. 14.5995)
     * @param float|null $lon   Longitude (e.g. 120.9842)
     * @param string     $city  Human-readable city name for display
     */
    public function getWeather(
        ?float $lat = null,
        ?float $lon = null,
        string $city = self::DEFAULT_CITY,
    ): ?array {
        $lat = $lat ?? self::DEFAULT_LAT;
        $lon = $lon ?? self::DEFAULT_LON;

        $cacheKey = "weather:{$lat}:{$lon}";

        return Cache::remember($cacheKey, 1800, function () use ($lat, $lon, $city) {
            return $this->fetch($lat, $lon, $city);
        });
    }

    /**
     * Build a concise, Lumi-ready text summary of the weather for injection
     * into the chat system prompt.
     *
     * @param float|null $lat
     * @param float|null $lon
     * @param string     $city
     */
    public function getPromptContext(
        ?float $lat = null,
        ?float $lon = null,
        string $city = self::DEFAULT_CITY,
    ): string {
        $data = $this->getWeather($lat, $lon, $city);

        if (! $data) {
            return "Weather data is currently unavailable.";
        }

        $cur = $data['current'];
        $lines = [
            "WEATHER ({$city}, as of {$cur['time']}):",
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

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function fetch(float $lat, float $lon, string $city): ?array
    {
        $url = 'https://api.open-meteo.com/v1/forecast?' . http_build_query([
            'latitude'      => $lat,
            'longitude'     => $lon,
            'timezone'      => self::DEFAULT_TIMEZONE,
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

        // If clear sky at night, swap to moon emoji
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

    /**
     * Summarise today's hourly array: peak/trough temps, rain window.
     */
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

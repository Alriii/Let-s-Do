<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Service providing accurate Philippine National Regular and Special Non-Working Holidays,
 * long weekend detection, and prompt-ready context for the AI.
 */
class PhilippineCalendarService
{
    /**
     * Standard fixed Philippine Holidays.
     * Types: 'regular' (Regular Holiday), 'special' (Special Non-Working Day).
     */
    private const FIXED_HOLIDAYS = [
        '01-01' => ['name' => "New Year's Day", 'type' => 'regular'],
        '01-02' => ['name' => 'Special Non-Working Day', 'type' => 'special'],
        '02-25' => ['name' => 'EDSA People Power Revolution Anniversary', 'type' => 'special'],
        '04-09' => ['name' => 'Araw ng Kagitingan (Day of Valor)', 'type' => 'regular'],
        '05-01' => ['name' => 'Labor Day', 'type' => 'regular'],
        '06-12' => ['name' => 'Philippine Independence Day', 'type' => 'regular'],
        '08-21' => ['name' => 'Ninoy Aquino Day', 'type' => 'special'],
        '11-01' => ['name' => "All Saints' Day (Undas)", 'type' => 'special'],
        '11-02' => ['name' => "All Souls' Day", 'type' => 'special'],
        '11-30' => ['name' => 'Bonifacio Day', 'type' => 'regular'],
        '12-08' => ['name' => 'Feast of the Immaculate Conception', 'type' => 'special'],
        '12-24' => ['name' => 'Christmas Eve', 'type' => 'special'],
        '12-25' => ['name' => 'Christmas Day', 'type' => 'regular'],
        '12-30' => ['name' => 'Rizal Day', 'type' => 'regular'],
        '12-31' => ['name' => "Last Day of the Year (New Year's Eve)", 'type' => 'special'],
    ];

    /**
     * Movable holidays for 2026 (Holy Week, National Heroes Day, Eid'l Fitr, Eid'l Adha).
     */
    private const MOVABLE_HOLIDAYS_2026 = [
        '2026-03-20' => ['name' => "Eid'l Fitr", 'type' => 'regular'],
        '2026-04-02' => ['name' => 'Maundy Thursday', 'type' => 'regular'],
        '2026-04-03' => ['name' => 'Good Friday', 'type' => 'regular'],
        '2026-04-04' => ['name' => 'Black Saturday', 'type' => 'special'],
        '2026-05-27' => ['name' => "Eid'l Adha", 'type' => 'regular'],
        '2026-08-31' => ['name' => 'National Heroes Day', 'type' => 'regular'],
    ];

    /**
     * Check if a specific date is a Philippine holiday.
     */
    public function getHoliday(Carbon|string $date): ?array
    {
        $carbon = $date instanceof Carbon ? $date : Carbon::parse($date);
        $fullDate = $carbon->format('Y-m-d');
        $md = $carbon->format('m-d');

        // Check movable 2026 holidays
        if (isset(self::MOVABLE_HOLIDAYS_2026[$fullDate])) {
            return array_merge(self::MOVABLE_HOLIDAYS_2026[$fullDate], [
                'date' => $fullDate,
                'formatted_date' => $carbon->format('F j, Y'),
                'day_of_week' => $carbon->format('l'),
            ]);
        }

        // Check fixed holidays
        if (isset(self::FIXED_HOLIDAYS[$md])) {
            return array_merge(self::FIXED_HOLIDAYS[$md], [
                'date' => $fullDate,
                'formatted_date' => $carbon->format('F j, Y'),
                'day_of_week' => $carbon->format('l'),
            ]);
        }

        return null;
    }

    /**
     * Check if tomorrow is a Philippine holiday.
     */
    public function getTomorrowHoliday(?Carbon $now = null): ?array
    {
        $now = $now ?: now();
        return $this->getHoliday($now->copy()->addDay());
    }

    /**
     * Check if today is a Philippine holiday.
     */
    public function getTodayHoliday(?Carbon $now = null): ?array
    {
        $now = $now ?: now();
        return $this->getHoliday($now);
    }

    /**
     * Get upcoming holidays within the next N days.
     */
    public function getUpcomingHolidays(int $daysAhead = 14, ?Carbon $now = null): array
    {
        $now = $now ?: now();
        $upcoming = [];

        for ($i = 0; $i <= $daysAhead; $i++) {
            $checkDate = $now->copy()->addDays($i);
            $holiday = $this->getHoliday($checkDate);
            if ($holiday) {
                $holiday['days_away'] = $i;
                $holiday['is_today'] = ($i === 0);
                $holiday['is_tomorrow'] = ($i === 1);
                $upcoming[] = $holiday;
            }
        }

        return $upcoming;
    }

    /**
     * Check if an upcoming holiday forms a long weekend.
     */
    public function getLongWeekendInfo(?Carbon $now = null): ?array
    {
        $now = $now ?: now();

        for ($i = 0; $i <= 5; $i++) {
            $date = $now->copy()->addDays($i);
            $holiday = $this->getHoliday($date);
            if ($holiday) {
                $dayOfWeek = $date->dayOfWeek; // 1 = Monday, 5 = Friday
                if ($dayOfWeek === Carbon::MONDAY || $dayOfWeek === Carbon::FRIDAY) {
                    return [
                        'holiday' => $holiday,
                        'days_away' => $i,
                        'type' => $dayOfWeek === Carbon::MONDAY ? 'Monday Holiday (Long Weekend)' : 'Friday Holiday (Long Weekend)',
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Build prompt context for AI describing upcoming Philippine holidays.
     */
    public function getPromptContext(?Carbon $now = null): string
    {
        $now = $now ?: now();
        $todayHoliday = $this->getTodayHoliday($now);
        $tomorrowHoliday = $this->getTomorrowHoliday($now);
        $upcoming = $this->getUpcomingHolidays(7, $now);
        $longWeekend = $this->getLongWeekendInfo($now);

        $lines = ["Country: Philippines (Timezone: Asia/Manila, Today is {$now->format('l, F j, Y')})"];

        if ($todayHoliday) {
            $lines[] = "TODAY IS A PHILIPPINE HOLIDAY: {$todayHoliday['name']} ({$todayHoliday['type']}).";
        }

        if ($tomorrowHoliday) {
            $lines[] = "TOMORROW IS A PHILIPPINE HOLIDAY: {$tomorrowHoliday['name']} ({$tomorrowHoliday['type']}).";
        }

        if ($longWeekend) {
            $lines[] = "LONG WEEKEND DETECTED: {$longWeekend['holiday']['name']} on {$longWeekend['holiday']['formatted_date']} ({$longWeekend['holiday']['day_of_week']}).";
        }

        if (!empty($upcoming)) {
            $list = [];
            foreach ($upcoming as $u) {
                $list[] = "{$u['name']} on {$u['formatted_date']} ({$u['day_of_week']})";
            }
            $lines[] = "Upcoming Philippine Holidays: " . implode('; ', $list);
        } else {
            $lines[] = "No Philippine holidays within the next 7 days.";
        }

        return implode("\n", $lines);
    }
}

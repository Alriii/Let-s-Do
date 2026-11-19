<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// searches web using duckduckgo html
class WebSearchService
{
    private const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    // patterns to check if message needs search
    private const SCHEDULE_INTENT_PATTERNS = [
        '/\b(mall|store|shop|branch|office|bank|embassy|clinic|hospital|gym|market|supermarket)\s+(hours?|schedule|closing|opening|time)\b/i',
        '/\bwhat\s+time\s+does\s+.*(open|close|start|end)\b/i',
        '/\b(closing|opening)\s+time\s+of\b/i',
        '/\bis\s+.*(open|closed)\s+(today|now|tomorrow|tonight)\b/i',
        '/\b(sm|ayala|robinsons|megamall|glorietta|greenbelt|trinoma|moa|mall of asia|bdo|bpi|metrobank)\b/i',
        '/\b(mrt|lrt|pnr|bus|train|flight|ferry)\s+(schedule|hours|status)\b/i',
        '/\b(typhoon|storm|flood|class\s+suspension|walang\s+pasok)\b/i',
        '/\bsearch\s+(google|the\s+web|online|internet)\s+for\b/i',
        // Hotels & staycations — schedule-relevant (check-in/out, availability, amenities)
        '/\b(hotel|hotels|resort|resorts|staycation|inn|hostel|airbnb|villa|lodge)\b/i',
        '/\b(check[- ]?in|check[- ]?out)\s+(time|schedule|hours?)\b/i',
        '/\b(book|reserve|reservation)\s+.*(hotel|room|resort|staycation|suite)\b/i',
        '/\b(best|cheap|affordable|budget|luxury)\s+(hotel|resort|staycation|rooms?)\b/i',
        '/\b(hotel|resort|staycation)\s+(near|in|at|around)\b/i',
        '/\bwhere\s+(to\s+)?(stay|sleep|book|staycay)\b/i',
        '/\bstaycay\b/i',
        // Restaurants & food
        '/\b(restaurant|resto|cafe|coffee\s*shop|diner|eatery|fastfood|food\s*park|carinderia)\b/i',
        '/\b(where\s+to\s+eat|best\s+food|good\s+food|food\s+near|restos?\s+(near|in|at))\b/i',
        '/\b(reservation|book\s+a\s+table|dine\s+in)\s+.*(resto|restaurant|cafe)\b/i',
        // Movie & event schedules
        '/\b(cinema|movie|film|showing|screening|concert|event|exhibit|festival)\s*(schedule|hours?|time|today|near|ticket)?\b/i',
        '/\b(sm\s*cinema|ayala\s*cinemas?|robinsons\s*movieworld|vsmile|imax|odeon)\b/i',
        '/\bwhat\s*(movie|film|show)\s*is\s*(now\s*)?showing\b/i',
        // Fitness & health
        '/\b(gym|fitness|crossfit|yoga|pilates|zumba|swimming\s*pool)\s*(hours?|schedule|open|near)\b/i',
        '/\b(workout|exercise|training|meal\s*prep)\s*(plan|schedule|routine|reminder)\b/i',
        // Government services
        '/\b(dfa|nbi|philsys|sss|gsis|pagibig|pag\-?ibig|bir|lto|dti|phil\s*health|philhealth)\b/i',
        '/\b(passport|clearance|appointment|government\s*(office|service|agency))\s*(schedule|hours?|how\s+to|steps?|process)\b/i',
        // Travel & commute
        '/\b(flight|airline|airport|grab|angkas|taxi|jeep|bus|mrt|lrt)\s*(schedule|fare|route|time|price)\b/i',
        '/\b(commute|travel\s*time|how\s+to\s+get\s+to|directions?\s+to)\b/i',
        // Grocery & errands
        '/\b(grocery|supermarket|palengke|wet\s*market|puregold|savemore|waltermart|landers)\b/i',
        '/\b(errand|to[- ]?do\s+list|shopping\s+list|batch\s+(errands?|tasks?))\b/i',
        // Online shopping & delivery
        '/\b(shopee|lazada|zalora|tiktok\s*shop|carousell)\s*(sale|promo|voucher|delivery|tracking)\b/i',
        '/\b(online\s+(shopping|order)|delivery\s+(time|schedule|track|status))\b/i',
        '/\b(11\.11|12\.12|mega\s*sale|flash\s*sale|payday\s*sale)\b/i',
    ];

    // check if we should search
    public function shouldSearch(string $message): bool
    {
        foreach (self::SCHEDULE_INTENT_PATTERNS as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    // search duckduckgo
    public function search(string $query, int $maxResults = 4): array
    {
        $cleanQuery = trim(preg_replace('/[^\w\s\-\.\,\?\!]/u', ' ', $query));
        if (empty($cleanQuery)) {
            return [];
        }

        $cacheKey = 'web_search:' . md5(strtolower($cleanQuery));

        return Cache::remember($cacheKey, 3600, function () use ($cleanQuery, $maxResults) {
            return $this->fetchFromWeb($cleanQuery, $maxResults);
        });
    }

    // get search context for prompt
    public function getPromptContext(string $userMessage): ?string
    {
        if (! $this->shouldSearch($userMessage)) {
            return null;
        }

        // clean query
        $query = preg_replace('/^(can\s+you\s+(check|search|find)|please\s+(check|search)|what\s+is|tell\s+me)\s+/i', '', trim($userMessage));
        $query = rtrim($query, '?.,!');

        $results = $this->search($query);

        if (empty($results)) {
            return null;
        }

        $lines = ["LIVE INTERNET SEARCH RESULTS (for: \"{$query}\"):"];
        foreach ($results as $i => $item) {
            $num = $i + 1;
            $lines[] = "  [{$num}] {$item['title']}";
            $lines[] = "      {$item['snippet']}";
        }
        $lines[] = "Use this live information to answer accurately and help the user plan their schedule!";

        return implode("\n", $lines);
    }

    // scrape results from duckduckgo html
    private function fetchFromWeb(string $query, int $maxResults): array
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(8)->asForm()->post('https://html.duckduckgo.com/html/', [
                'q' => $query,
            ]);

            if (! $response->successful()) {
                Log::warning("WebSearchService: DuckDuckGo returned status {$response->status()}");
                return [];
            }

            $html = $response->body();
            $results = [];

            // get result snippets and titles
            preg_match_all(
                '/<h2[^>]*class="result__title"[^>]*>.*?<a[^>]*class="result__url"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/si',
                $html,
                $fullMatches,
                PREG_SET_ORDER
            );

            if (! empty($fullMatches)) {
                foreach (array_slice($fullMatches, 0, $maxResults) as $match) {
                    $results[] = [
                        'url' => trim(strip_tags($match[1])),
                        'title' => trim(html_entity_decode(strip_tags($match[2]))),
                        'snippet' => trim(html_entity_decode(strip_tags($match[3]))),
                    ];
                }
            } else {
                // Fallback: match snippets directly
                preg_match_all('/<a class="result__snippet[^>]*>(.*?)<\/a>/si', $html, $snippetMatches);
                preg_match_all('/<a class="result__url[^>]*>(.*?)<\/a>/si', $html, $titleMatches);

                $snippets = $snippetMatches[1] ?? [];
                $titles = $titleMatches[1] ?? [];

                for ($i = 0; $i < min(count($snippets), $maxResults); $i++) {
                    $results[] = [
                        'url' => '',
                        'title' => isset($titles[$i]) ? trim(html_entity_decode(strip_tags($titles[$i]))) : "Search Result #" . ($i + 1),
                        'snippet' => trim(html_entity_decode(strip_tags($snippets[$i]))),
                    ];
                }
            }

            return $results;
        } catch (\Throwable $e) {
            Log::warning("WebSearchService error: {$e->getMessage()}");
            return [];
        }
    }
}

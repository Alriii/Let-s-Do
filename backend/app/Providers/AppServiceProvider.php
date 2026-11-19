<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Brute-force / email-bombing protection for the auth endpoints.
        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute(5)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(3)
            ->by($request->ip()));

        RateLimiter::for('auth-code', fn (Request $request) => Limit::perMinute(4)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('auth-verify', fn (Request $request) => Limit::perMinute(10)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));

        // AI Chat: 20 messages per minute per authenticated user (prevents API abuse)
        RateLimiter::for('ai-chat', fn (Request $request) => Limit::perMinute(20)
            ->by(optional($request->user())->id ?: $request->ip())
            ->response(fn () => response()->json([
                'message' => 'Too many messages. Please slow down and try again in a moment! 🌿',
            ], 429)));
    }
}

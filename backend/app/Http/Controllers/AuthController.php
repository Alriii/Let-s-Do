<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendVerificationCodeRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\VerifyEmailRequest;
use App\Models\User;
use App\Services\VerificationCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Controller handling all authentication workflows:
 * Registration, Email Verification, Login, Logout, and Password Recovery.
 */
class AuthController extends Controller
{
    /**
     * Inject the VerificationCodeService for generating and verifying codes.
     */
    public function __construct(
        protected VerificationCodeService $verificationCodeService
    ) {}

    /**
     * Handle user registration.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // 1. Create user (password automatically hashed by User model casts).
        $name = trim(($validated['first_name'] ?? '').' '.($validated['last_name'] ?? ''));
        if ($name === '') {
            $name = $validated['name']
                ?? Str::of($validated['email'])
                    ->before('@')
                    ->replace(['.', '_', '-'], ' ')
                    ->title()
                    ->trim()
                    ->toString();
        }

        $user = User::create([
            'name' => $name !== '' ? $name : 'User',
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        // 2. Generate and email the 6-digit verification code
        $this->verificationCodeService->generateAndSend($user->email, 'email_verification');

        // 3. Return response
        return response()->json([
            'message' => 'User registered successfully. Please check your email for the verification code.',
            'requires_verification' => true,
            'user' => $this->userPayload($user),
        ], 201);
    }

    /**
     * Handle email verification using the 6-digit code.
     */
    public function verifyEmail(VerifyEmailRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $isValid = $this->verificationCodeService->verify(
            $validated['email'],
            $validated['code'],
            'email_verification'
        );

        if (! $isValid) {
            return response()->json([
                'message' => 'The verification code is invalid, expired, or has exceeded maximum attempts.',
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();
        if ($user) {
            $user->email_verified_at = now();
            $user->save();
        }

        return response()->json([
            'message' => 'Email verified successfully. You can now log in.',
        ], 200);
    }

    /**
     * Resend a fresh 6-digit verification code.
     */
    public function resendVerificationEmail(ResendVerificationCodeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->verificationCodeService->generateAndSend(
            $validated['email'],
            'email_verification'
        );

        return response()->json([
            'message' => 'A fresh verification code has been sent to your email address.',
        ], 200);
    }

    /**
     * Handle user login.
     * Blocks login if email is not yet verified.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');
        $remember = $request->boolean('remember');

        // 1. Check user exists and password is valid
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 401);
        }

        // 2. Block login until email verification (per project requirements)
        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'requires_verification' => true,
                'email' => $user->email,
            ], 403);
        }

        // 3. Authenticate session if stateful SPA request
        if ($request->hasSession()) {
            Auth::login($user, $remember);
            $request->session()->regenerate();
        }

        // 4. Issue Sanctum API token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->userPayload($user),
        ], 200);
    }

    /**
     * Handle user logout and session invalidation.
     */
    public function logout(Request $request): JsonResponse
    {
        // 1. Revoke current access token
        $request->user()?->currentAccessToken()?->delete();

        // 2. Invalidate web session if present
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ], 200);
    }

    /**
     * Return authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ], 200);
    }

    /**
     * Update the authenticated user's profile and preferences.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        // 1. Email changes need a re-verification flow that does not exist yet.
        if ($request->filled('email') && Str::lower($request->string('email')->toString()) !== $user->email) {
            return response()->json([
                'message' => 'Changing your email address is not supported yet.',
            ], 422);
        }

        // 2. Update display name if provided
        if ($request->has('name')) {
            $user->name = $request->validated('name');
        }

        // 3. Persist the Preferences screen toggles
        if ($request->has('theme')) {
            $user->theme = $request->validated('theme');
        }

        if ($request->has('task_reminders_enabled')) {
            $user->task_reminders_enabled = $request->validated('task_reminders_enabled');
        }

        if ($request->has('daily_digest_enabled')) {
            $user->daily_digest_enabled = $request->validated('daily_digest_enabled');
        }

        // 4. Update password if requested
        $passwordChanged = false;

        if ($request->filled('new_password')) {
            // Verify current password matches
            if (! Hash::check($request->validated('current_password'), $user->password)) {
                return response()->json([
                    'message' => 'The provided current password is incorrect.',
                ], 422);
            }

            $user->password = $request->validated('new_password');
            $passwordChanged = true;
        }

        $user->save();

        // 5. Changing the password revokes every other API token.
        if ($passwordChanged) {
            $this->revokeOtherTokens($request, $user);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->userPayload($user->fresh()),
        ], 200);
    }

    /**
     * Upload or replace the authenticated user's avatar.
     * Stores the image as a base64 data URL in the database so it
     * persists across ephemeral container restarts (e.g. Render).
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $file = $request->file('avatar');

        if (! $file) {
            return response()->json([
                'message' => 'Please select an image file to upload as your profile photo.',
                'errors'  => ['avatar' => ['No image file was received by the server.']],
            ], 422);
        }

        if (! $file->isValid()) {
            return response()->json([
                'message' => 'The uploaded file could not be processed (' . $file->getErrorMessage() . '). Please choose an image under 2MB.',
                'errors'  => ['avatar' => [$file->getErrorMessage()]],
            ], 422);
        }

        $request->validate([
            'avatar' => ['required', 'file', 'extensions:jpg,jpeg,png,webp,gif,bmp,avif', 'max:2048'],
        ]);

        $user = $request->user();

        // Convert to base64 data URL — stored in DB, no filesystem needed
        $mime    = $file->getMimeType() ?: 'image/jpeg';
        $encoded = base64_encode(file_get_contents($file->getRealPath()));
        $dataUrl = "data:{$mime};base64,{$encoded}";

        // Clear legacy file-based avatar if present
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = null;
        }

        $user->avatar_data = $dataUrl;
        $user->save();

        return response()->json([
            'message'    => 'Avatar updated successfully.',
            'avatar_url' => $user->avatarUrl(),
            'user'       => $this->userPayload($user),
        ], 200);
    }

    /**
     * Remove the authenticated user's avatar.
     */
    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = null;
        }

        // Clear base64 avatar too
        $user->avatar_data = null;
        $user->save();

        return response()->json([
            'message'    => 'Avatar removed.',
            'avatar_url' => null,
            'user'       => $this->userPayload($user),
        ], 200);
    }

    /**
     * Send password reset code to user email.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->verificationCodeService->generateAndSend(
            $validated['email'],
            'password_reset'
        );

        return response()->json([
            'message' => 'A password reset code has been sent to your email address.',
        ], 200);
    }

    /**
     * Reset password after verifying the 6-digit code.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // 1. Verify code
        $isValid = $this->verificationCodeService->verify(
            $validated['email'],
            $validated['code'],
            'password_reset'
        );

        if (! $isValid) {
            return response()->json([
                'message' => 'The password reset code is invalid, expired, or has exceeded maximum attempts.',
            ], 422);
        }

        // 2. Update password and revoke every existing API token so stolen
        // sessions cannot survive a password reset.
        $user = User::where('email', $validated['email'])->first();
        if ($user) {
            $user->password = $validated['password'];
            $user->save();
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ], 200);
    }

    /**
     * Consistent user payload shared by the auth endpoints.
     *
     * @return array<string, mixed>
     */
    protected function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'avatar_url' => $user->avatarUrl(),
            'preferences' => [
                'theme' => $user->theme,
                'task_reminders_enabled' => $user->task_reminders_enabled,
                'daily_digest_enabled' => $user->daily_digest_enabled,
            ],
            'created_at' => $user->created_at,
        ];
    }

    /**
     * Revoke all API tokens except the one making the current request.
     */
    protected function revokeOtherTokens(Request $request, User $user): void
    {
        $currentToken = $request->user()?->currentAccessToken();
        $currentTokenId = $currentToken instanceof PersonalAccessToken
            ? $currentToken->getKey()
            : null;

        $tokens = $user->tokens();

        if ($currentTokenId !== null) {
            $tokens->whereKeyNot($currentTokenId);
        }

        $tokens->delete();
    }
}

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

        // 1. Create user (password automatically hashed by User model casts)
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        // 2. Generate and email the 6-digit verification code
        $this->verificationCodeService->generateAndSend($user->email, 'email_verification');

        // 3. Return response
        return response()->json([
            'message' => 'User registered successfully. Please check your email for the verification code.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
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
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
            ],
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
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
            ],
        ], 200);
    }

    /**
     * Update authenticated user profile (name and/or password).
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        // 1. Update name if provided
        if ($request->has('name')) {
            $user->name = $request->validated('name');
        }

        // 2. Update password if requested
        if ($request->filled('new_password')) {
            // Verify current password matches
            if (! Hash::check($request->validated('current_password'), $user->password)) {
                return response()->json([
                    'message' => 'The provided current password is incorrect.',
                ], 422);
            }

            $user->password = $request->validated('new_password');
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
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

        // 2. Update password
        $user = User::where('email', $validated['email'])->first();
        if ($user) {
            $user->password = $validated['password'];
            $user->save();
        }

        return response()->json([
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ], 200);
    }
}

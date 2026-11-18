<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validates updates to the authenticated user's profile and password.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // User can update their display name
            'name' => ['sometimes', 'required', 'string', 'max:255'],

            // Email changes require a re-verification flow; the controller
            // rejects attempts to change it and ignores unchanged values.
            'email' => ['sometimes', 'string', 'email', 'max:255'],

            // Preferences from the Figma "Preferences" screen
            'theme' => ['sometimes', 'required', 'string', 'in:light,dark'],
            'task_reminders_enabled' => ['sometimes', 'boolean'],
            'daily_digest_enabled' => ['sometimes', 'boolean'],

            // If updating password, current password is required for confirmation
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => [
                'sometimes',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ];
    }
}

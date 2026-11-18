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

<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the 6-digit email verification code submitted by the user.
 */
class VerifyEmailRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Anyone with a code can attempt to verify.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Email must exist in our users table
            'email' => ['required', 'string', 'email', 'exists:users,email'],

            // Code must be exactly 6 characters
            'code' => ['required', 'string', 'size:6'],
        ];
    }

    /**
     * Custom friendly error messages when validation fails.
     */
    public function messages(): array
    {
        return [
            'email.exists' => 'We could not find an account with that email address.',
            'code.size' => 'The verification code must be exactly 6 digits.',
        ];
    }
}

<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates request to resend the 6-digit email verification code.
 */
class ResendVerificationCodeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
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
        ];
    }

    /**
     * Custom friendly error messages when validation fails.
     */
    public function messages(): array
    {
        return [
            'email.exists' => 'We could not find an account with that email address.',
        ];
    }
}

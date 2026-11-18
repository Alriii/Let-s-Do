<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates updates to an existing task.
 */
class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'in:Work,Personal,Health,Errands'],
            'due_date' => ['sometimes', 'required', 'date'],
            'due_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'priority' => ['sometimes', 'required', 'string', 'in:Low,Medium,High'],
            'notes' => ['nullable', 'string', 'max:500'],
            // Lifecycle fields (status/completed_at/cancelled_at) are intentionally
            // not editable here: use the complete/cancel/reopen endpoints instead.
        ];
    }
}

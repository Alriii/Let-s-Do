<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates data for creating a new task.
 */
class CreateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:Work,Personal,Health,Errands,School'],
            'due_date' => ['required', 'date'],
            'due_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'start_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'end_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'priority' => ['required', 'string', 'in:Low,Medium,High'],
            'notes' => ['nullable', 'string', 'max:500'],
            'reminder_enabled' => ['nullable', 'boolean'],
            'reminder_target' => ['nullable', 'string', 'in:start_time,end_time'],
            'reminder_interval_minutes' => ['nullable', 'integer', 'in:1,2,3,5,10,15,30,60'],
            'reminder_count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }
}

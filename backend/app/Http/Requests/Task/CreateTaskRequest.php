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
            'category' => ['required', 'string', 'in:Work,Personal,Health,Errands'],
            'due_date' => ['required', 'date'],
            'due_time' => ['nullable', 'string'],
            'priority' => ['required', 'string', 'in:Low,Medium,High'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

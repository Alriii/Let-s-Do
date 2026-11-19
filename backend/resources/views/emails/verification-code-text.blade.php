@php
    $isReset = $purpose === 'password_reset';
@endphp
{{ $isReset ? "Reset your Let's Do! password" : 'Your Let\'s Do! verification code' }}

{{ $isReset ? 'Enter this code to choose a new password.' : 'Enter this code to finish setting up your account.' }}

    {{ $code }}

This code expires in 15 minutes.

If you didn't request this, you can ignore this email.

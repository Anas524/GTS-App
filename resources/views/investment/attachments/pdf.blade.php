<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; }
        .page { page-break-after: always; text-align: center; }
        img { width: 100%; max-height: 100vh; object-fit: contain; }
    </style>
</head>
<body>
    @if($invoice)
    <div class="page">
        <img src="{{ public_path($invoice) }}" alt="Invoice">
    </div>
    @endif

    @if($receipt)
    <div class="page">
        <img src="{{ public_path($receipt) }}" alt="Receipt">
    </div>
    @endif

    @if($note)
    <div class="page">
        <img src="{{ public_path($note) }}" alt="Note">
    </div>
    @endif
</body>
</html>

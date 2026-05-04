<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Investment Attachments</title>
    <style>
        .attachment-title {
            font-weight: bold;
            margin-top: 30px;
        }

        .attachment-img {
            margin-top: 10px;
            max-width: 100%;
            max-height: 600px;
        }
    </style>
</head>

<body>
    <h2 style="text-align: center;">Investment Attachments</h2>

    @if(!empty($attachments['invoice']) && file_exists(public_path('storage/invoice/' . $attachments['invoice'])))
    <div>
        <h3>Invoice</h3>
        <img src="{{ public_path('storage/invoice/' . $attachments['invoice']) }}" style="width:100%; max-height:500px;">
    </div>
    @endif

    @if(!empty($attachments['receipt']) && file_exists(public_path('storage/receipt/' . $attachments['receipt'])))
    <div>
        <h3>Bank Transfer Receipt</h3>
        <img src="{{ public_path('storage/receipt/' . $attachments['receipt']) }}" style="width:100%; max-height:500px;">
    </div>
    @endif

    @if(!empty($attachments['note']) && file_exists(public_path('storage/note/' . $attachments['note'])))
    <div>
        <h3>Delivery Note</h3>
        <img src="{{ public_path('storage/note/' . $attachments['note']) }}" style="width:100%; max-height:500px;">
    </div>
    @endif

</body>

</html>
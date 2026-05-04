<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ $title }}</title>
  <style>
    @page {
      margin: 20px;
    }

    body {
      font-family: sans-serif;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .attachment-img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>

  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">{{ $title }}</h1>

  @foreach($attachments as $name => $path)
    <div style="page-break-inside: avoid;">
      <div class="section-title">{{ $name }}</div>
      <img src="{{ $path }}" alt="{{ $name }}" class="attachment-img">
    </div>
  @endforeach

</body>
</html>

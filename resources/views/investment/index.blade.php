@extends('investment.layouts.app')
@section('content')

    <!-- Summary SHEET -->
    <div id="sheet-summary" class="sheet-section">
        @include('investment.sheets.summary')
    </div>
      
    <!-- Beneficiary SHEET -->
    <div id="sheet-beneficiary" class="sheet-section" style="display:none">
        @include('investment.sheets.beneficiary_sheet')
    </div>
  
    <!-- GTS MATERIAL SHEET -->
    <div id="sheet-gts-material" class="sheet-section" style="display: none;">
      @include('investment.sheets.gts_material')
    </div>
    
    <!-- GTS INVESTMENT SHEET -->
    <div id="sheet-gts-investment" class="sheet-section" style="display: none;">
      @include('investment.sheets.gts_investment')
    </div>
    
    <!-- US CLIENT PAYMENT SHEET -->
    <div id="sheet-us" class="sheet-section" style="display: none;">
      @include('investment.sheets.us_client_payment')
    </div>
    
    <!-- SQ SHEET -->
    <div id="sheet-sq" class="sheet-section" style="display: none;">
      @include('investment.sheets.sq_sheet')
    </div>
    
    <!-- Local Sales SHEET -->
    <div id="sheet-local" class="sheet-section" style="display: none;">
      @include('investment.sheets.local_sales_sheet')
    </div>
    
    <!-- Customer Sheets (Included from shared file) -->
    
    @foreach ($customerSheets as $sheet)
      @include('investment.sheets.customer_sheet', [
        'sheetName' => $sheet->sheet_name,
        'sheetId' => $sheet->id
      ])
    @endforeach
    
    <!-- Shared Customer Add Modal -->
    @include('investment.partials.customer_add_row_modal')
    
@endsection
    
    @php
    $tabScript = '';
      foreach ($customerSheets as $sheet) {
        $id = strtolower($sheet->sheet_name);
        $name = strtoupper($sheet->sheet_name);
        $tabScript .= "tabsContainer.innerHTML += `<button class=\\\"sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100\\\" data-sheet=\\\"customer-$id\\\">$name</button>`;\n";
      }
    @endphp
    
@section('customerSheets')
  {{-- Step 1: JSON script --}}

  <script id="customerTabsData" type="application/json">
    {!! json_encode($customerSheets->map(function($sheet) {
      return [
        'id' => strtolower($sheet->sheet_name),
        'name' => strtoupper($sheet->sheet_name)
      ];
    })) !!}
  </script>

  {{-- Step 2: JS to generate tab buttons --}}
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      const dataTag = document.getElementById('customerTabsData');
      const tabsContainer = document.getElementById('customerTabsContainer');

      if (dataTag) {
        const sheets = JSON.parse(dataTag.textContent);
        sheets.forEach(sheet => {
          const btn = document.createElement('button');
          btn.className = 'sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100';
          btn.setAttribute('data-sheet', `customer-${sheet.id}`);
          btn.textContent = sheet.name;
          tabsContainer.appendChild(btn);
        });
      }
    });
  </script>

@endsection
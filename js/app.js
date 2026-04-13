$(function () {
  'use strict';

  // ===== Constants =====
  var ACCESS_CODE = 'JewelBalaam';
  var SESSION_KEY = 'balaam_auth';

  // ===== State =====
  var currency = 'IDR';   // 'IDR' | 'MXN'
  var isLocked = false;
  var stoneCount = 0;

  // ===== Helpers =====
  function parsNum(val) {
    if (!val) return 0;
    // strip thousand separators (commas), keep decimals
    return parseFloat(String(val).replace(/,/g, '')) || 0;
  }

  function fmtLocal(n) {
    // Format with thousand separator, no decimals for IDR, 2 for MXN
    if (currency === 'IDR') {
      return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtUSD(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Clamp tariff input to 0–100 on every keystroke
  $(document).on('input', '#tariff', function () {
    var v = parseFloat($(this).val());
    if (v > 100) $(this).val(100);
    if (v < 0) $(this).val(0);
  });

  // ===== 1. Currency Selection =====
  function updateCurrencyLabels() {
    var code = currency;
    $('.currency-symbol').text(code);
    $('.currency-label').text(code);
    $('.currency-code').text(code);
    var rateLabel = 'Exchange Rate ' + code + ' / USD';
    $('label[for="exchangeRate"]').html(rateLabel);
  }

  $('input[name="currency"]').on('change', function () {
    var newCur = $(this).val();
    if (newCur === currency) return;
    currency = newCur;

    // Reset everything
    unlockParams();
    clearBaseInputs();
    clearVariant();
    hideOutput();
    updateCurrencyLabels();
  });

  function clearBaseInputs() {
    $('#exchangeRate').val('');
    $('#silverPrice').val('');
    $('#tariff').val('');
    $('#shipping').val('');
  }

  // ===== 3. Lock / Unlock =====
  $('#lockBtn').on('click', function () {
    if (isLocked) {
      unlockParams();
    } else {
      lockParams();
    }
  });

  function lockParams() {
    isLocked = true;
    $('.base-input').prop('readonly', true);
    $('#baseParamsSection').addClass('locked');
    $('#lockBtn')
      .html('<i class="bi bi-lock-fill"></i> Unlock')
      .addClass('locked');
    $('#lockStatus').html('<i class="bi bi-check-circle me-1"></i> Base parameters are locked. Unlock to edit.');
  }

  function unlockParams() {
    isLocked = false;
    $('.base-input').prop('readonly', false);
    $('#baseParamsSection').removeClass('locked');
    $('#lockBtn')
      .html('<i class="bi bi-unlock"></i> Lock')
      .removeClass('locked');
    $('#lockStatus').html('<i class="bi bi-info-circle me-1"></i> Set your base parameters, then lock them for repeated calculations.');
  }

  // ===== 4. Dynamic Stones =====
  function addStone() {
    stoneCount++;
    var idx = stoneCount;
    var html =
      '<div class="stone-row" data-stone="' + idx + '">' +
        '<div class="stone-label">Stone ' + idx + '</div>' +
        '<button type="button" class="stone-remove" data-remove="' + idx + '" title="Remove">&times;</button>' +
        '<div class="row g-2">' +
          '<div class="col-6">' +
            '<div class="input-group input-group-sm">' +
              '<span class="input-group-text currency-symbol">' + currency + '</span>' +
              '<input type="text" inputmode="decimal" class="form-control stone-price" placeholder="Price/pc" data-idx="' + idx + '">' +
            '</div>' +
          '</div>' +
          '<div class="col-6">' +
            '<div class="input-group input-group-sm">' +
              '<input type="text" inputmode="numeric" class="form-control stone-qty" placeholder="Qty" data-idx="' + idx + '">' +
              '<span class="input-group-text">pcs</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    $('#stonesContainer').append(html);
    renumberStones();
  }

  function renumberStones() {
    $('#stonesContainer .stone-row').each(function (i) {
      $(this).find('.stone-label').text('Stone ' + (i + 1));
    });
  }

  $('#addStoneBtn').on('click', function () {
    addStone();
  });

  $(document).on('click', '.stone-remove', function () {
    $(this).closest('.stone-row').remove();
    renumberStones();
  });

  // ===== 5. Calculation =====
  $('#calcBtn').on('click', function () {
    // Gather base params
    var rate = parsNum($('#exchangeRate').val());
    var silver = parsNum($('#silverPrice').val());
    var tariff = parsNum($('#tariff').val());
    var shipping = parsNum($('#shipping').val());
    var weight = parsNum($('#weight').val());
    var labour = parsNum($('#labour').val());

    // Clamp tariff 0–100
    if (tariff < 0) tariff = 0;
    if (tariff > 100) tariff = 100;

    // Validate essentials
    if (!rate) { alert('Please enter the exchange rate.'); return; }
    if (!silver) { alert('Please enter the silver price per gram.'); return; }
    if (!weight) { alert('Please enter the jewelry weight.'); return; }

    // Sum stones
    var stonesTotal = 0;
    $('#stonesContainer .stone-row').each(function () {
      var price = parsNum($(this).find('.stone-price').val());
      var qty = parsNum($(this).find('.stone-qty').val());
      stonesTotal += price * qty;
    });

    // A = (weight * silver) + stones + labour
    var A = (weight * silver) + stonesTotal + labour;

    // Production cost local = A + A*(tariff/100)
    var prodLocal = A + (A * (tariff / 100));

    // Production cost USD = (prodLocal / rate) + shipping
    var prodUSD = (prodLocal / rate) + shipping;

    // Wholesale USD = prodUSD / 3
    var wholesale = prodUSD / 3;

    // Display
    $('#resultLocal').text(currency + ' ' + fmtLocal(prodLocal));
    $('#resultUSD').text('USD ' + fmtUSD(prodUSD));
    $('#resultWholesale').text('USD ' + fmtUSD(wholesale));
    $('#outputSection').removeClass('d-none');

    // Scroll to output
    $('html, body').animate({
      scrollTop: $('#outputSection').offset().top - 80
    }, 300);
  });

  // ===== 6. Clear =====
  $('#clearBtn').on('click', function () {
    clearVariant();
    hideOutput();
  });

  function clearVariant() {
    $('#weight').val('');
    $('#labour').val('');
    $('#stonesContainer').empty();
    stoneCount = 0;
  }

  function hideOutput() {
    $('#outputSection').addClass('d-none');
    $('#resultLocal').text('—');
    $('#resultUSD').text('—');
    $('#resultWholesale').text('—');
  }

  // ===== Init =====
  updateCurrencyLabels();
});

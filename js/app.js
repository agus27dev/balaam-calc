$(function () {
  'use strict';

  // ===== Constants =====
  var ACCESS_CODE = 'JewelBalaam';
  var SESSION_KEY = 'balaam_auth';

  // ===== State =====
  var currency = 'IDR';   // 'IDR' | 'MXN' | 'USD'
  var calcMode = 'standard'; // 'standard' | 'fixed'
  var isLocked = false;
  var isFixedLocked = false;
  var stoneCount = 0;
  var fixedStoneCount = 0;

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
  $(document).on('input', '#tariff, #fixedTariff', function () {
    var v = parseFloat($(this).val());
    if (v > 100) $(this).val(100);
    if (v < 0) $(this).val(0);
  });

  // ===== Mode Toggle =====
  $('input[name="calcMode"]').on('change', function () {
    calcMode = $(this).val();
    if (calcMode === 'standard') {
      $('#standardMode').removeClass('d-none');
      $('#fixedMode').addClass('d-none');
    } else {
      $('#standardMode').addClass('d-none');
      $('#fixedMode').removeClass('d-none');
    }
    hideOutput();
  });

  // ===== 1. Currency Selection =====
  function updateCurrencyLabels() {
    var code = currency;
    $('.currency-symbol').text(code);
    $('.currency-label').text(code);
    $('.currency-code').text(code);
    var rateLabel = 'Exchange Rate ' + code + ' / USD';
    $('label[for="exchangeRate"]').html(rateLabel);

    // USD: lock exchange rate to 1
    if (code === 'USD') {
      $('#exchangeRate').val('1').prop('readonly', true);
      $('#fixedExchangeRate').val('1').prop('readonly', true);
    } else {
      if (!isLocked) {
        $('#exchangeRate').prop('readonly', false);
      }
      if (!isFixedLocked) {
        $('#fixedExchangeRate').prop('readonly', false);
      }
    }
  }

  $('input[name="currency"]').on('change', function () {
    var newCur = $(this).val();
    if (newCur === currency) return;
    currency = newCur;

    // Reset everything
    unlockParams();
    unlockFixedParams();
    clearBaseInputs();
    clearFixedInputs();
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

  function clearFixedInputs() {
    $('#fixedExchangeRate').val('');
    $('#fixedTariff').val('');
    $('#fixedShipping').val('');
    $('#fixedPrice').val('');
    $('#fixedStonesContainer').empty();
    fixedStoneCount = 0;
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
    // Keep exchange rate readonly if USD
    if (currency === 'USD') {
      $('#exchangeRate').prop('readonly', true);
    }
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

  // ---- Fixed Price Stones ----
  function addFixedStone() {
    fixedStoneCount++;
    var idx = fixedStoneCount;
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
    $('#fixedStonesContainer').append(html);
    renumberFixedStones();
  }

  function renumberFixedStones() {
    $('#fixedStonesContainer .stone-row').each(function (i) {
      $(this).find('.stone-label').text('Stone ' + (i + 1));
    });
  }

  $('#fixedAddStoneBtn').on('click', function () {
    addFixedStone();
  });

  $(document).on('click', '.stone-remove', function () {
    var $container = $(this).closest('#stonesContainer, #fixedStonesContainer');
    $(this).closest('.stone-row').remove();
    if ($container.attr('id') === 'fixedStonesContainer') {
      renumberFixedStones();
    } else {
      renumberStones();
    }
  });

  // ---- Fixed Price Lock / Unlock ----
  $('#fixedLockBtn').on('click', function () {
    if (isFixedLocked) {
      unlockFixedParams();
    } else {
      lockFixedParams();
    }
  });

  function lockFixedParams() {
    isFixedLocked = true;
    $('.fixed-base-input').prop('readonly', true);
    $('#fixedBaseSection').addClass('locked');
    $('#fixedLockBtn')
      .html('<i class="bi bi-lock-fill"></i> Unlock')
      .addClass('locked');
    $('#fixedLockStatus').html('<i class="bi bi-check-circle me-1"></i> Base parameters are locked. Unlock to edit.');
  }

  function unlockFixedParams() {
    isFixedLocked = false;
    $('.fixed-base-input').prop('readonly', false);
    if (currency === 'USD') {
      $('#fixedExchangeRate').prop('readonly', true);
    }
    $('#fixedBaseSection').removeClass('locked');
    $('#fixedLockBtn')
      .html('<i class="bi bi-unlock"></i> Lock')
      .removeClass('locked');
    $('#fixedLockStatus').html('<i class="bi bi-info-circle me-1"></i> Set your base parameters, then lock them for repeated calculations.');
  }

  // ===== 5. Calculation =====
  $('#calcBtn').on('click', function () {
    if (calcMode === 'standard') {
      calcStandard();
    } else {
      calcFixed();
    }
  });

  function calcStandard() {
    var rate = parsNum($('#exchangeRate').val());
    var silver = parsNum($('#silverPrice').val());
    var tariff = parsNum($('#tariff').val());
    var shipping = parsNum($('#shipping').val());
    var weight = parsNum($('#weight').val());
    var labour = parsNum($('#labour').val());

    if (tariff < 0) tariff = 0;
    if (tariff > 100) tariff = 100;

    if (!rate) { alert('Please enter the exchange rate.'); return; }
    if (!silver) { alert('Please enter the silver price per gram.'); return; }
    if (!weight) { alert('Please enter the jewelry weight.'); return; }

    var stonesTotal = 0;
    $('#stonesContainer .stone-row').each(function () {
      var price = parsNum($(this).find('.stone-price').val());
      var qty = parsNum($(this).find('.stone-qty').val());
      stonesTotal += price * qty;
    });

    var A = (weight * silver) + stonesTotal + labour;
    var prodLocal = A + (A * (tariff / 100)) + (shipping * rate);
    var prodUSD = prodLocal / rate;
    var wholesale = prodUSD / 3;

    showResults(prodLocal, prodUSD, wholesale);
  }

  function calcFixed() {
    var rate = parsNum($('#fixedExchangeRate').val());
    var tariff = parsNum($('#fixedTariff').val());
    var shipping = parsNum($('#fixedShipping').val());
    var fixedPrice = parsNum($('#fixedPrice').val());

    if (tariff < 0) tariff = 0;
    if (tariff > 100) tariff = 100;

    if (!rate) { alert('Please enter the exchange rate.'); return; }
    if (!fixedPrice) { alert('Please enter the fixed price.'); return; }

    var stonesTotal = 0;
    $('#fixedStonesContainer .stone-row').each(function () {
      var price = parsNum($(this).find('.stone-price').val());
      var qty = parsNum($(this).find('.stone-qty').val());
      stonesTotal += price * qty;
    });

    var A = fixedPrice + stonesTotal;
    var prodLocal = A + (A * (tariff / 100)) + (shipping * rate);
    var prodUSD = prodLocal / rate;
    var wholesale = prodUSD / 3;

    showResults(prodLocal, prodUSD, wholesale);
  }

  function showResults(prodLocal, prodUSD, wholesale) {
    $('#resultLocal').text(currency + ' ' + fmtLocal(prodLocal));
    $('#resultUSD').text('USD ' + fmtUSD(prodUSD));
    $('#resultWholesale').text('USD ' + fmtUSD(wholesale));
    $('#outputSection').removeClass('d-none');

    $('html, body').animate({
      scrollTop: $('#outputSection').offset().top - 80
    }, 300);
  }

  // ===== 6. Clear =====
  $('#clearBtn').on('click', function () {
    clearVariant();
    hideOutput();
  });

  function clearVariant() {
    if (calcMode === 'standard') {
      $('#weight').val('');
      $('#labour').val('');
      $('#stonesContainer').empty();
      stoneCount = 0;
    } else {
      $('#fixedPrice').val('');
      $('#fixedStonesContainer').empty();
      fixedStoneCount = 0;
    }
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

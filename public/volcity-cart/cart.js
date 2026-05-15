// Volcity Store Cart — static asset served from /volcity-cart/cart.js
(function () {
  'use strict';

  var CHECKOUT_URL = window.location.origin + '/api/checkout/store';
  var meta = document.querySelector('meta[name="volcity-project-id"]');
  if (!meta || !meta.content || meta.content === '__PROJECT_ID__') return;
  var PROJECT_ID = meta.content;

  var cart = [];

  // ── Extra styles ───────────────────────────────────────────────
  var extraStyle = document.createElement('style');
  extraStyle.textContent = [
    '.vc-item-variant{font-size:11px;color:#888;margin-top:2px;}',
    '.vc-item-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}',
    '.vc-qty-ctrl{display:flex;align-items:center;border:1.5px solid #E7E5E4;border-radius:6px;overflow:hidden;}',
    '.vc-qty-btn{width:26px;height:26px;border:none;background:#F5F4F2;cursor:pointer;font-size:15px;color:#555;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;}',
    '.vc-qty-num{min-width:26px;text-align:center;font-size:12px;font-weight:600;color:#1A1A1A;}',
    '.vc-remove-new{width:28px;height:28px;border:none;background:none;cursor:pointer;color:#CCC;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;border-radius:6px;transition:color .15s,background .15s;}',
    '.vc-remove-new:hover{color:#EF4444;background:#FEF2F2;}',
    /* PDP responsive */
    '@media(max-width:640px){',
      '#vc-pdp-inner{flex-direction:column!important;border-radius:12px 12px 0 0!important;max-height:95vh!important;}',
      '#vc-pdp-gallery{width:100%!important;flex-direction:column-reverse!important;max-height:260px!important;}',
      '#vc-pdp-thumbs{flex-direction:row!important;width:auto!important;overflow-x:auto!important;overflow-y:hidden!important;padding:8px!important;}',
      '#vc-pdp-info{padding:16px!important;max-height:none!important;}',
    '}',
  ].join('');
  document.head.appendChild(extraStyle);

  // ══════════════════════════════════════════════════════════════════
  // PRODUCT DETAIL PAGE (Amazon-style)
  // ══════════════════════════════════════════════════════════════════

  var pdp = document.createElement('div');
  pdp.id = 'vc-pdp';
  pdp.setAttribute('style', [
    'display:none',
    'position:fixed',
    'inset:0',
    'z-index:10001',
    'background:rgba(0,0,0,0.55)',
    'align-items:center',
    'justify-content:center',
    'padding:16px',
    'box-sizing:border-box',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  ].join(';'));

  pdp.innerHTML = [
    '<div id="vc-pdp-inner" style="background:#fff;border-radius:16px;width:100%;max-width:860px;max-height:88vh;overflow:hidden;display:flex;flex-direction:row;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.28);">',

      /* LEFT — image gallery */
      '<div id="vc-pdp-gallery" style="width:50%;display:flex;flex-direction:row;background:#F8F7F5;flex-shrink:0;overflow:hidden;">',
        '<div id="vc-pdp-thumbs" style="width:72px;padding:12px 6px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex-shrink:0;background:#EEECEA;"></div>',
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;min-width:0;">',
          '<img id="vc-pdp-main-img" src="" alt="" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:8px;display:block;">',
        '</div>',
      '</div>',

      /* RIGHT — product info */
      '<div id="vc-pdp-info" style="flex:1;padding:28px 22px 22px;overflow-y:auto;min-width:0;max-height:88vh;box-sizing:border-box;">',
        '<button id="vc-pdp-close" style="position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:#999;padding:4px 6px;z-index:2;">&times;</button>',

        '<h2 id="vc-pdp-name" style="margin:0 36px 8px 0;font-size:20px;font-weight:700;color:#1A1A1A;line-height:1.3;"></h2>',

        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">',
          '<span style="color:#F59E0B;font-size:14px;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>',
          '<span style="font-size:12px;color:#888;">4.9 stars</span>',
        '</div>',

        '<div id="vc-pdp-price" style="font-size:26px;font-weight:700;color:#1A1A1A;margin-bottom:18px;"></div>',

        '<div style="height:1px;background:#F0EFED;margin-bottom:18px;"></div>',

        /* Color selector */
        '<div id="vc-pdp-color-sect" style="margin-bottom:18px;">',
          '<div style="font-size:13px;font-weight:600;color:#1A1A1A;margin-bottom:10px;">',
            'Color: <span id="vc-pdp-color-label" style="font-weight:400;color:#555;"></span>',
          '</div>',
          '<div id="vc-pdp-color-swatches" style="display:flex;flex-wrap:wrap;gap:8px;"></div>',
        '</div>',

        /* Size selector */
        '<div id="vc-pdp-size-sect" style="margin-bottom:20px;">',
          '<div style="font-size:13px;font-weight:600;color:#1A1A1A;margin-bottom:10px;">Size:</div>',
          '<div id="vc-pdp-size-btns" style="display:flex;flex-wrap:wrap;gap:8px;"></div>',
        '</div>',

        /* Quantity */
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">',
          '<span style="font-size:13px;font-weight:600;color:#1A1A1A;">Qty:</span>',
          '<div style="display:flex;align-items:center;border:1.5px solid #E7E5E4;border-radius:9px;overflow:hidden;">',
            '<button id="vc-pdp-qty-minus" style="width:36px;height:36px;border:none;background:#FAFAF8;cursor:pointer;font-size:18px;color:#555;display:flex;align-items:center;justify-content:center;padding:0;">&#8722;</button>',
            '<span id="vc-pdp-qty-val" style="min-width:34px;text-align:center;font-size:15px;font-weight:600;color:#1A1A1A;padding:0 2px;">1</span>',
            '<button id="vc-pdp-qty-plus" style="width:36px;height:36px;border:none;background:#FAFAF8;cursor:pointer;font-size:18px;color:#555;display:flex;align-items:center;justify-content:center;padding:0;">&#43;</button>',
          '</div>',
        '</div>',

        /* Add to Cart */
        '<button id="vc-pdp-add" disabled style="width:100%;padding:14px;border-radius:10px;border:none;background:#E5E7EB;color:#9CA3AF;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:18px;transition:background .15s,color .15s;letter-spacing:.01em;">Select color &amp; size</button>',

        '<div style="height:1px;background:#F0EFED;margin-bottom:14px;"></div>',
        '<div id="vc-pdp-desc" style="font-size:13px;color:#666;line-height:1.7;"></div>',

      '</div>',
    '</div>',
  ].join('');
  document.body.appendChild(pdp);

  /* PDP state */
  var pdpState = {
    variants: [], mockupUrls: [], selectedColor: null, selectedSize: null,
    selectedVariantId: null, qty: 1, card: null, priceCents: 0, name: '',
  };

  function openPDP(card, data) {
    console.log('[volcity-cart] openPDP called:', { name: data.name, priceCents: data.priceCents, variantCount: (data.variants||[]).length, mockupCount: (data.mockupUrls||[]).length, hasImage: !!data.image });
    var nameEl = document.getElementById('vc-pdp-name');
    var priceEl = document.getElementById('vc-pdp-price');
    var pdpEl = document.getElementById('vc-pdp');
    console.log('[volcity-cart] DOM elements:', { pdp: !!pdpEl, name: !!nameEl, price: !!priceEl, pdpIsThis: pdpEl === pdp });
    Object.assign(pdpState, {
      variants: data.variants || [],
      mockupUrls: data.mockupUrls || [],
      selectedColor: null, selectedSize: null, selectedVariantId: null,
      qty: 1, card: card, priceCents: data.priceCents || 0, name: data.name || 'Product',
    });

    document.getElementById('vc-pdp-name').textContent = pdpState.name;
    document.getElementById('vc-pdp-price').textContent = '$' + (pdpState.priceCents / 100).toFixed(2);
    document.getElementById('vc-pdp-qty-val').textContent = '1';
    document.getElementById('vc-pdp-desc').textContent = data.description || '';

    /* Image gallery */
    var mainImg = document.getElementById('vc-pdp-main-img');
    var thumbsEl = document.getElementById('vc-pdp-thumbs');
    thumbsEl.innerHTML = '';
    thumbsEl.style.display = '';

    var images = pdpState.mockupUrls.length > 0 ? pdpState.mockupUrls : (data.image ? [data.image] : []);
    if (images.length > 0) { mainImg.src = images[0]; mainImg.style.display = ''; }
    else { mainImg.src = ''; mainImg.style.display = 'none'; }

    if (images.length > 1) {
      images.forEach(function (url, i) {
        var thumb = document.createElement('button');
        thumb.style.cssText = 'width:54px;height:54px;border-radius:8px;border:2px solid ' + (i === 0 ? '#0f172a' : 'transparent') + ';background:#fff;cursor:pointer;padding:2px;flex-shrink:0;overflow:hidden;transition:border .1s;';
        var img = document.createElement('img');
        img.src = url; img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:6px;display:block;';
        thumb.appendChild(img);
        thumb.addEventListener('click', function () {
          mainImg.src = url;
          thumbsEl.querySelectorAll('button').forEach(function (b, j) {
            b.style.border = '2px solid ' + (j === i ? '#0f172a' : 'transparent');
          });
        });
        thumbsEl.appendChild(thumb);
      });
    } else {
      thumbsEl.style.display = 'none';
    }

    /* Colors */
    var colors = pdpState.variants.reduce(function (acc, v) {
      if (acc.indexOf(v.color) === -1) acc.push(v.color); return acc;
    }, []);
    var swatchEl = document.getElementById('vc-pdp-color-swatches');
    swatchEl.innerHTML = '';
    document.getElementById('vc-pdp-color-sect').style.display = colors.length > 1 ? '' : 'none';
    document.getElementById('vc-pdp-color-label').textContent = '';
    if (colors.length === 1) {
      pdpState.selectedColor = colors[0];
      document.getElementById('vc-pdp-color-label').textContent = colors[0];
    }
    colors.forEach(function (color) {
      var v0 = pdpState.variants.find(function (v) { return v.color === color; });
      var code = (v0 && v0.color_code) ? v0.color_code : '#999';
      var swatch = document.createElement('button');
      swatch.title = color;
      swatch.style.cssText = 'width:32px;height:32px;border-radius:7px;border:2.5px solid ' +
        (pdpState.selectedColor === color ? '#0f172a' : '#E7E5E4') +
        ';background:' + code + ';cursor:pointer;transition:border .1s;flex-shrink:0;';
      swatch.addEventListener('click', function () {
        pdpState.selectedColor = color;
        pdpState.selectedSize = null;
        pdpState.selectedVariantId = null;
        document.getElementById('vc-pdp-color-label').textContent = color;
        swatchEl.querySelectorAll('button').forEach(function (b) { b.style.border = '2.5px solid #E7E5E4'; });
        swatch.style.border = '2.5px solid #0f172a';
        renderPDPSizes();
        updatePDPAddBtn();
      });
      swatchEl.appendChild(swatch);
    });

    renderPDPSizes();
    updatePDPAddBtn();
    pdp.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('[volcity-cart] openPDP complete — pdp.style.display:', pdp.style.display, 'colors:', pdpState.variants.reduce(function(a,v){if(a.indexOf(v.color)<0)a.push(v.color);return a;},[]).length, 'variants:', pdpState.variants.length);
  }

  function closePDP() {
    pdp.style.display = 'none';
    document.body.style.overflow = '';
  }

  function renderPDPSizes() {
    var sizeEl = document.getElementById('vc-pdp-size-btns');
    sizeEl.innerHTML = '';
    var pool = pdpState.selectedColor
      ? pdpState.variants.filter(function (v) { return v.color === pdpState.selectedColor; })
      : pdpState.variants;
    var sizes = pool.reduce(function (acc, v) { if (acc.indexOf(v.size) === -1) acc.push(v.size); return acc; }, []);
    sizes.forEach(function (size) {
      var btn = document.createElement('button');
      btn.textContent = size;
      var sel = pdpState.selectedSize === size;
      btn.style.cssText = 'padding:8px 16px;border-radius:8px;min-width:46px;' +
        'border:1.5px solid ' + (sel ? '#0f172a' : '#E7E5E4') + ';' +
        'background:' + (sel ? '#0f172a' : '#FAFAF8') + ';' +
        'color:' + (sel ? '#fff' : '#1A1A1A') + ';' +
        'font-size:13px;font-weight:500;cursor:pointer;transition:background .1s,border .1s;';
      btn.addEventListener('click', function () {
        pdpState.selectedSize = size;
        var v = pdpState.variants.find(function (v) {
          return v.size === size && (!pdpState.selectedColor || v.color === pdpState.selectedColor);
        });
        pdpState.selectedVariantId = v ? v.id : null;
        renderPDPSizes();
        updatePDPAddBtn();
      });
      sizeEl.appendChild(btn);
    });
  }

  function updatePDPAddBtn() {
    var addBtn = document.getElementById('vc-pdp-add');
    var colors = pdpState.variants.reduce(function (acc, v) {
      if (acc.indexOf(v.color) === -1) acc.push(v.color); return acc;
    }, []);
    var needColor = colors.length > 1 && !pdpState.selectedColor;
    var needSize = !pdpState.selectedSize;
    if (needColor && needSize) addBtn.textContent = 'Select color & size';
    else if (needColor) addBtn.textContent = 'Select a color';
    else if (needSize) addBtn.textContent = 'Select a size';
    else addBtn.textContent = 'Add to Cart';
    var ready = !needColor && !needSize;
    addBtn.disabled = !ready;
    addBtn.style.background = ready ? '#FF9900' : '#E5E7EB';
    addBtn.style.color = ready ? '#111' : '#9CA3AF';
    addBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
  }

  /* PDP close */
  document.getElementById('vc-pdp-close').addEventListener('click', function (e) {
    e.stopPropagation();
    closePDP();
  });
  pdp.addEventListener('click', function (e) {
    if (e.target === pdp) closePDP();
  });

  /* Qty buttons */
  document.getElementById('vc-pdp-qty-minus').addEventListener('click', function () {
    if (pdpState.qty > 1) { pdpState.qty--; document.getElementById('vc-pdp-qty-val').textContent = String(pdpState.qty); }
  });
  document.getElementById('vc-pdp-qty-plus').addEventListener('click', function () {
    if (pdpState.qty < 10) { pdpState.qty++; document.getElementById('vc-pdp-qty-val').textContent = String(pdpState.qty); }
  });

  /* Add to Cart from PDP */
  document.getElementById('vc-pdp-add').addEventListener('click', function () {
    if (!pdpState.selectedSize) return;
    var colorLabel = pdpState.selectedColor || '';
    var sizeLabel = pdpState.selectedSize || '';
    var variantLabel = [colorLabel, sizeLabel].filter(Boolean).join(' / ');
    var cartName = variantLabel ? pdpState.name + ' \u2014 ' + variantLabel : pdpState.name;
    var sourceBtn = pdpState.card && pdpState.card.querySelector('[data-add-to-cart]');
    var baseId = (sourceBtn && sourceBtn.dataset.productId) || pdpState.name;
    var cartId = baseId + '::' + (pdpState.selectedVariantId || variantLabel);
    var imgSrc = document.getElementById('vc-pdp-main-img').src || null;
    if (imgSrc && imgSrc.slice(-1) === '/') imgSrc = null; /* avoid base URL */

    var existing = cart.find(function (i) { return i.id === cartId; });
    if (existing) { existing.qty += pdpState.qty; }
    else {
      cart.push({
        id: cartId, name: cartName, price: pdpState.priceCents,
        image: imgSrc, qty: pdpState.qty,
        color: colorLabel, size: sizeLabel,
        variant_id: pdpState.selectedVariantId,
      });
    }

    /* Brief success animation */
    var addBtn = document.getElementById('vc-pdp-add');
    addBtn.textContent = 'Added to Cart \u2713';
    addBtn.style.background = '#16a34a';
    addBtn.style.color = '#fff';
    setTimeout(function () {
      closePDP();
      render();
      open();
    }, 700);
  });

  /* Helper to open PDP from a product card element */
  function openPDPFromCard(card) {
    try {
      var variants = JSON.parse(card.dataset.variants || '[]');
      if (!variants || variants.length === 0) {
        console.warn('[volcity-cart] openPDPFromCard: no variants on card', card.dataset.variants);
        return false;
      }
      var btn = card.querySelector('[data-add-to-cart]');
      /* Read data from card div first (most reliable), fall back to inner button */
      var priceCents = parseInt(card.dataset.productPrice || (btn && btn.dataset.productPrice) || '0', 10);
      var nameEl = card.querySelector('h3,[class*="product-name"]');
      var name = card.dataset.productName || (btn && btn.dataset.productName) || (nameEl ? nameEl.textContent.trim() : '') || 'Product';
      var mockupUrls = [];
      try { if (card.dataset.mockupUrls) mockupUrls = JSON.parse(card.dataset.mockupUrls); } catch (ex) {}
      var imgEl = card.querySelector('img');
      var image = card.dataset.productImage || (btn && btn.dataset.productImage) || (imgEl ? imgEl.getAttribute('src') : null) || null;
      /* Treat empty-string image as missing */
      if (!image) image = null;
      var descEl = card.querySelector('[class*="product-desc"],.product-desc');
      var description = card.dataset.description || (descEl ? descEl.textContent.trim() : '');
      console.log('[volcity-cart] openPDPFromCard:', { name: name, priceCents: priceCents, variants: variants.length, mockups: mockupUrls.length, image: image ? image.slice(0, 60) : null, btnFound: !!btn });
      openPDP(card, { variants: variants, mockupUrls: mockupUrls, priceCents: priceCents, name: name.slice(0, 100), image: image, description: description });
      return true;
    } catch (ex) {
      console.warn('[volcity-cart] openPDPFromCard failed:', ex);
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // CART DRAWER
  // ══════════════════════════════════════════════════════════════════

  var cartUI = document.createElement('div');
  cartUI.innerHTML = [
    '<button id="vc-toggle" aria-label="Open cart">',
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>',
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      '</svg>',
      '<span>Cart</span>',
      '<span id="vc-count">0</span>',
    '</button>',
    '<div id="vc-backdrop"></div>',
    '<aside id="vc-panel" aria-label="Shopping cart">',
      '<header>',
        '<h3>Your Cart</h3>',
        '<button id="vc-close" aria-label="Close cart">&times;</button>',
      '</header>',
      '<div id="vc-items"><p class="vc-empty">Your cart is empty</p></div>',
      '<footer>',
        '<div class="vc-total"><span>Total</span><span id="vc-total">$0.00</span></div>',
        '<button id="vc-checkout" disabled>Checkout</button>',
      '</footer>',
    '</aside>',
  ].join('');
  document.body.appendChild(cartUI);

  var toggle   = document.getElementById('vc-toggle');
  var panel    = document.getElementById('vc-panel');
  var backdrop = document.getElementById('vc-backdrop');
  var closeBtn = document.getElementById('vc-close');
  var itemsEl  = document.getElementById('vc-items');
  var totalEl  = document.getElementById('vc-total');
  var countEl  = document.getElementById('vc-count');
  var checkoutBtn = document.getElementById('vc-checkout');

  function open()  { panel.classList.add('open');    backdrop.classList.add('open'); }
  function close() { panel.classList.remove('open'); backdrop.classList.remove('open'); }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); closePDP(); } });

  // ── Render cart items ────────────────────────────────────────────
  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function render() {
    var totalQty   = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var totalCents = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    countEl.textContent = String(totalQty);
    countEl.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    totalEl.textContent = '$' + (totalCents / 100).toFixed(2);
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="vc-empty">Your cart is empty</p>';
      return;
    }

    itemsEl.innerHTML = cart.map(function (item, i) {
      var variantLine = [item.color, item.size].filter(Boolean).join(' / ');
      return [
        '<div class="vc-item" data-cart-idx="' + i + '">',
          item.image
            ? '<img src="' + escHtml(item.image) + '" alt="" loading="lazy">'
            : '<div class="vc-no-img"></div>',
          '<div class="vc-item-body">',
            '<div class="vc-item-name">' + escHtml(item.name) + '</div>',
            variantLine ? '<div class="vc-item-variant">' + escHtml(variantLine) + '</div>' : '',
            '<div class="vc-item-row">',
              '<div class="vc-qty-ctrl">',
                '<button class="vc-qty-btn" data-action="minus" data-cart-idx="' + i + '">&#8722;</button>',
                '<span class="vc-qty-num">' + item.qty + '</span>',
                '<button class="vc-qty-btn" data-action="plus"  data-cart-idx="' + i + '">&#43;</button>',
              '</div>',
              '<div class="vc-item-price">$' + (item.price * item.qty / 100).toFixed(2) + '</div>',
            '</div>',
          '</div>',
          '<button class="vc-remove-new" data-cart-idx="' + i + '" aria-label="Remove">',
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">',
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
            '</svg>',
          '</button>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* Event delegation for remove + qty buttons inside cart panel */
  itemsEl.addEventListener('click', function (e) {
    var removeBtn = e.target.closest && e.target.closest('.vc-remove-new');
    if (removeBtn) {
      e.stopPropagation();
      var idx = parseInt(removeBtn.dataset.cartIdx, 10);
      if (!isNaN(idx) && idx >= 0 && idx < cart.length) { cart.splice(idx, 1); render(); }
      return;
    }
    var qtyBtn = e.target.closest && e.target.closest('.vc-qty-btn');
    if (qtyBtn) {
      e.stopPropagation();
      var idx = parseInt(qtyBtn.dataset.cartIdx, 10);
      if (!isNaN(idx) && cart[idx]) {
        if (qtyBtn.dataset.action === 'minus') {
          if (cart[idx].qty > 1) cart[idx].qty--; else cart.splice(idx, 1);
        } else {
          if (cart[idx].qty < 10) cart[idx].qty++;
        }
        render();
      }
      return;
    }
  });

  // ── Add to Cart — capture phase event delegation ────────────────
  document.addEventListener('click', function (e) {
    /* Ignore all clicks inside the PDP overlay or the cart panel */
    if (e.target && e.target.closest) {
      if (e.target.closest('#vc-pdp') || e.target.closest('#vc-panel')) return;
    }

    /* Ignore builder-injected delete/action buttons so they can handle their own events */
    if (e.target && e.target.closest && e.target.closest('[data-vc-delete-btn]')) return;

    /* Case 1: click anywhere on a Printful product card (not just the button) */
    var pCard = e.target.closest && e.target.closest('[data-printful="true"][data-variants]');
    if (pCard) {
      e.preventDefault();
      e.stopPropagation();
      openPDPFromCard(pCard);
      return;
    }

    /* Case 2: generic add-to-cart button (non-Printful) */
    var btn = e.target && e.target.closest && e.target.closest(
      '[data-add-to-cart], .add-to-cart, button[data-product-price]'
    );
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var priceCents = parseInt(btn.dataset.productPrice || btn.dataset.price || '0', 10);
    if (priceCents < 100 && btn.dataset.price && !btn.dataset.productPrice) {
      priceCents = Math.round(parseFloat(btn.dataset.price) * 100);
    }
    if (!priceCents || priceCents <= 0) {
      console.warn('[volcity-cart] button has no valid price, skipping', btn);
      return;
    }

    var name = (btn.dataset.productName || btn.dataset.name || '').trim();
    if (!name) {
      var cardEl = btn.closest('[data-product-card], .product-card') || btn.parentElement;
      var h = cardEl && cardEl.querySelector('h3, h4, [class*="product-name"]');
      if (h) name = h.textContent.trim();
    }
    name = (name || 'Product').slice(0, 80);

    var product = {
      id: btn.dataset.productId || btn.dataset.id || name,
      name: name, price: priceCents,
      image: btn.dataset.productImage || btn.dataset.image || null,
      qty: 1,
    };
    var existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) existing.qty++; else cart.push(product);
    render();
    open();
  }, true);

  // ── Checkout ───────────────────────────────────────────────────
  checkoutBtn.addEventListener('click', function () {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Loading\u2026';
    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: PROJECT_ID, items: cart, returnUrl: window.location.origin + window.location.pathname }),
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        if (!r.ok || !r.data.url) throw new Error(r.data.error || 'Checkout failed');
        (window.top || window).location.href = r.data.url;
      })
      .catch(function (err) {
        alert('Checkout error: ' + err.message);
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Checkout';
      });
  });

  // ── Success banner ─────────────────────────────────────────────
  if (new URLSearchParams(window.location.search).get('checkout') === 'success') {
    var banner = document.createElement('div');
    banner.id = 'vc-success';
    banner.textContent = 'Order placed! Check your email for confirmation.';
    document.body.appendChild(banner);
    setTimeout(function () { banner.remove(); }, 5000);
    window.history.replaceState({}, '', window.location.pathname);
  }

  console.log('[volcity-cart] initialized for project ' + PROJECT_ID);
})();

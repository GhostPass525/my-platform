// Volcity Store Cart — static asset served from /volcity-cart/cart.js
(function () {
  'use strict';

  // Derive checkout URL from current origin so this works on any domain / localhost
  var CHECKOUT_URL = window.location.origin + '/api/checkout/store';

  var meta = document.querySelector('meta[name="volcity-project-id"]');
  if (!meta || !meta.content || meta.content === '__PROJECT_ID__') {
    // Not yet published — cart disabled in builder preview
    return;
  }
  var PROJECT_ID = meta.content;

  var cart = [];

  // ── Inject product variant modal ───────────────────────────────
  var modalEl = document.createElement('div');
  modalEl.id = 'vc-product-modal';
  modalEl.style.cssText = 'display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
  modalEl.innerHTML = [
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">',
      '<button id="vc-modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;font-size:22px;line-height:1;color:#888;padding:4px;">&times;</button>',
      '<img id="vc-modal-img" src="" alt="" style="width:100%;height:180px;object-fit:contain;border-radius:10px;margin-bottom:14px;background:#F8F7F5;">',
      '<h3 id="vc-modal-name" style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1A1A1A;padding-right:28px;"></h3>',
      '<p id="vc-modal-price" style="margin:0 0 16px;font-size:15px;color:#555;font-weight:500;"></p>',
      '<div id="vc-modal-colors" style="margin-bottom:14px;">',
        '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#AAA;margin-bottom:8px;">Color</div>',
        '<div id="vc-modal-color-swatches" style="display:flex;flex-wrap:wrap;gap:6px;"></div>',
      '</div>',
      '<div id="vc-modal-sizes" style="margin-bottom:16px;">',
        '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#AAA;margin-bottom:8px;">Size</div>',
        '<div id="vc-modal-size-btns" style="display:flex;flex-wrap:wrap;gap:6px;"></div>',
      '</div>',
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">',
        '<label style="font-size:13px;color:#555;font-weight:500;">Qty:</label>',
        '<input id="vc-modal-qty" type="number" value="1" min="1" max="10" style="width:64px;padding:7px 8px;border:1.5px solid #E7E5E4;border-radius:8px;font-size:14px;text-align:center;outline:none;">',
      '</div>',
      '<button id="vc-modal-add" disabled style="width:100%;padding:13px;border-radius:10px;border:none;background:#E5E7EB;color:#9CA3AF;font-size:14px;font-weight:600;cursor:not-allowed;transition:background .15s;">Select color &amp; size</button>',
    '</div>',
  ].join('');
  document.body.appendChild(modalEl);

  // ── Modal state & logic ────────────────────────────────────────
  var modalState = { variants: [], selectedColor: null, selectedSize: null, selectedVariantId: null, card: null };

  function openVariantModal(card, variants, name, priceText, imageSrc) {
    modalState.variants = variants;
    modalState.selectedColor = null;
    modalState.selectedSize = null;
    modalState.selectedVariantId = null;
    modalState.card = card;

    document.getElementById('vc-modal-name').textContent = name;
    document.getElementById('vc-modal-price').textContent = priceText;
    var imgEl = document.getElementById('vc-modal-img');
    if (imageSrc) { imgEl.src = imageSrc; imgEl.style.display = ''; }
    else { imgEl.style.display = 'none'; }

    // Colors
    var colors = variants.reduce(function(acc, v) { if (acc.indexOf(v.color) === -1) acc.push(v.color); return acc; }, []);
    var swatchWrap = document.getElementById('vc-modal-color-swatches');
    swatchWrap.innerHTML = '';
    document.getElementById('vc-modal-colors').style.display = colors.length > 1 ? '' : 'none';
    if (colors.length === 1) modalState.selectedColor = colors[0];

    colors.forEach(function(color) {
      var v0 = variants.find(function(v) { return v.color === color; });
      var code = (v0 && v0.color_code) ? v0.color_code : '#999';
      var swatch = document.createElement('button');
      swatch.title = color;
      swatch.style.cssText = 'width:28px;height:28px;border-radius:50%;border:2px solid #E7E5E4;background:' + code + ';cursor:pointer;transition:border .1s;flex-shrink:0;';
      swatch.addEventListener('click', function() {
        modalState.selectedColor = color;
        modalState.selectedSize = null;
        modalState.selectedVariantId = null;
        swatchWrap.querySelectorAll('button').forEach(function(b) { b.style.border = '2px solid #E7E5E4'; });
        swatch.style.border = '3px solid #0f172a';
        renderModalSizes();
        updateModalAddBtn();
      });
      if (colors.length === 1) swatch.style.border = '3px solid #0f172a';
      swatchWrap.appendChild(swatch);
    });

    renderModalSizes();
    updateModalAddBtn();
    modalEl.style.display = 'flex';
  }

  function renderModalSizes() {
    var container = document.getElementById('vc-modal-size-btns');
    container.innerHTML = '';
    var pool = modalState.selectedColor
      ? modalState.variants.filter(function(v) { return v.color === modalState.selectedColor; })
      : modalState.variants;
    var sizes = pool.reduce(function(acc, v) { if (acc.indexOf(v.size) === -1) acc.push(v.size); return acc; }, []);
    sizes.forEach(function(size) {
      var btn = document.createElement('button');
      btn.textContent = size;
      var sel = modalState.selectedSize === size;
      btn.style.cssText = 'padding:6px 13px;border-radius:7px;border:1.5px solid ' + (sel ? '#0f172a' : '#E7E5E4') + ';background:' + (sel ? '#0f172a' : '#FAFAF8') + ';color:' + (sel ? '#fff' : '#1A1A1A') + ';font-size:13px;font-weight:500;cursor:pointer;transition:background .1s,border .1s;';
      btn.addEventListener('click', function() {
        modalState.selectedSize = size;
        var v = modalState.variants.find(function(v) { return v.size === size && (!modalState.selectedColor || v.color === modalState.selectedColor); });
        modalState.selectedVariantId = v ? v.id : null;
        renderModalSizes();
        updateModalAddBtn();
      });
      container.appendChild(btn);
    });
  }

  function updateModalAddBtn() {
    var addBtn = document.getElementById('vc-modal-add');
    var colors = modalState.variants.reduce(function(acc, v) { if (acc.indexOf(v.color) === -1) acc.push(v.color); return acc; }, []);
    var needColor = colors.length > 1 && !modalState.selectedColor;
    var needSize = !modalState.selectedSize;
    if (needColor && needSize) addBtn.textContent = 'Select color & size';
    else if (needColor) addBtn.textContent = 'Select a color';
    else if (needSize) addBtn.textContent = 'Select a size';
    else addBtn.textContent = 'Add to Cart';
    var ready = !needColor && !needSize;
    addBtn.disabled = !ready;
    addBtn.style.background = ready ? '#0f172a' : '#E5E7EB';
    addBtn.style.color = ready ? '#fff' : '#9CA3AF';
    addBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
  }

  document.getElementById('vc-modal-close').addEventListener('click', function() { modalEl.style.display = 'none'; });
  modalEl.addEventListener('click', function(e) { if (e.target === modalEl) modalEl.style.display = 'none'; });

  document.getElementById('vc-modal-add').addEventListener('click', function() {
    if (!modalState.selectedSize) return;
    var sourceBtn = modalState.card && modalState.card.querySelector('[data-add-to-cart]');
    var priceCents = sourceBtn ? parseInt(sourceBtn.dataset.productPrice || '0', 10) : 0;
    var productId = sourceBtn ? (sourceBtn.dataset.productId || '') : '';
    var name = document.getElementById('vc-modal-name').textContent || 'Product';
    var qty = Math.max(1, parseInt(document.getElementById('vc-modal-qty').value, 10) || 1);
    var imageSrc = document.getElementById('vc-modal-img').src || null;
    var colorLabel = modalState.selectedColor || '';
    var sizeLabel = modalState.selectedSize || '';
    var variantLabel = [colorLabel, sizeLabel].filter(Boolean).join(' / ');
    var cartName = variantLabel ? name + ' \u2014 ' + variantLabel : name;
    var cartId = productId + '::' + (modalState.selectedVariantId || variantLabel);

    var existing = cart.find(function(i) { return i.id === cartId; });
    if (existing) { existing.qty += qty; }
    else { cart.push({ id: cartId, name: cartName, price: priceCents, image: imageSrc, qty: qty, variant_id: modalState.selectedVariantId }); }

    render();
    open();
    modalEl.style.display = 'none';
  });

  // ── Inject UI ──────────────────────────────────────────────────
  var ui = document.createElement('div');
  ui.innerHTML = [
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
  document.body.appendChild(ui);

  var toggle = document.getElementById('vc-toggle');
  var panel = document.getElementById('vc-panel');
  var backdrop = document.getElementById('vc-backdrop');
  var closeBtn = document.getElementById('vc-close');
  var itemsEl = document.getElementById('vc-items');
  var totalEl = document.getElementById('vc-total');
  var countEl = document.getElementById('vc-count');
  var checkoutBtn = document.getElementById('vc-checkout');

  function open() { panel.classList.add('open'); backdrop.classList.add('open'); }
  function close() { panel.classList.remove('open'); backdrop.classList.remove('open'); }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // ── Render ─────────────────────────────────────────────────────
  function render() {
    var total_qty = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var total_cents = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);

    countEl.textContent = String(total_qty);
    countEl.style.display = total_qty > 0 ? 'inline-flex' : 'none';
    totalEl.textContent = '$' + (total_cents / 100).toFixed(2);
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="vc-empty">Your cart is empty</p>';
      return;
    }

    itemsEl.innerHTML = cart.map(function (item, i) {
      return '<div class="vc-item">' +
        (item.image
          ? '<img src="' + item.image + '" alt="" loading="lazy">'
          : '<div class="vc-no-img"></div>') +
        '<div class="vc-item-body">' +
          '<div class="vc-item-name">' + item.name + '</div>' +
          '<div class="vc-item-price">$' + (item.price / 100).toFixed(2) + ' &times; ' + item.qty + '</div>' +
        '</div>' +
        '<button class="vc-remove" data-idx="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');

    itemsEl.querySelectorAll('.vc-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cart.splice(parseInt(btn.dataset.idx, 10), 1);
        render();
      });
    });
  }

  // ── Add to Cart — event delegation, capture phase ──────────────
  // Capture phase fires before any inline onclick on the button itself.
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest(
      '[data-add-to-cart], .add-to-cart, button[data-product-price]'
    );
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    // Check if this is a Printful product with variants — open selector modal instead
    var card = btn.closest('[data-product-card], .product-card') || btn.parentElement;
    if (card && card.dataset.printful === 'true' && card.dataset.variants) {
      try {
        var variants = JSON.parse(card.dataset.variants);
        if (variants && variants.length > 0) {
          var mName = (btn.dataset.productName || '').trim() ||
            (card.querySelector('h3, h4, [class*="product-name"]') || {}).textContent || 'Product';
          var mPrice = (card.querySelector('[class*="product-price"], .price, .product-price') || {}).textContent || '';
          var mImg = btn.dataset.productImage || (card.querySelector('img') || {}).src || null;
          openVariantModal(card, variants, mName.trim().slice(0, 80), mPrice.trim(), mImg);
          return;
        }
      } catch (ex) { /* fall through to direct add */ }
    }

    var priceCents = parseInt(btn.dataset.productPrice || btn.dataset.price || '0', 10);
    // Support price in dollars (data-price) — convert to cents
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
      name: name,
      price: priceCents,
      image: btn.dataset.productImage || btn.dataset.image || null,
      qty: 1,
    };

    var existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) existing.qty++;
    else cart.push(product);

    render();
    open();
  }, true);

  // ── Checkout ───────────────────────────────────────────────────
  checkoutBtn.addEventListener('click', function () {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Loading...';

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJECT_ID,
        items: cart,
        returnUrl: window.location.origin + window.location.pathname,
      }),
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

  // ── Success banner on return ───────────────────────────────────
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

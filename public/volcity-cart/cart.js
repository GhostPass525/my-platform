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
      var card = btn.closest('[data-product-card], .product-card') || btn.parentElement;
      var h = card && card.querySelector('h3, h4, [class*="product-name"]');
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

/**
 * Volcity master Printful account library.
 * All API calls use Volcity's PRINTFUL_MASTER_API_KEY — no user OAuth tokens.
 */

const PRINTFUL_API = 'https://api.printful.com';

export function getPrintfulHeaders(): Record<string, string> {
  return getHeaders();
}

function getHeaders(): Record<string, string> {
  const key = process.env.PRINTFUL_MASTER_API_KEY;
  if (!key) throw new Error('PRINTFUL_MASTER_API_KEY is not set');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const storeId = process.env.PRINTFUL_STORE_ID;
  if (storeId) headers['X-PF-Store-Id'] = storeId;
  return headers;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PrintfulVariantInput = {
  variantId: number;   // Printful catalog variant ID
  retailPrice: string; // e.g. "29.99"
};

export type PrintfulOrderItem = {
  printful_variant_id: number | string;
  fulfillment_type: string;
  quantity: number;
};

export type PrintfulOrder = {
  id: string;
  customer_name?: string | null;
  shipping_method?: string | null;
  shipping_address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: PrintfulOrderItem[];
};

export type ShippingRecipient = {
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
};

export type ShippingItem = {
  variant_id: number | string;
  quantity: number;
};

// ── 1. Create sync product ────────────────────────────────────────────────────

/**
 * Creates a sync product on Volcity's master Printful account.
 * Uses external_id pattern: volcity_${userId}_${productId}
 */
export async function createPrintfulProduct(
  userId: string,
  productId: string,
  productName: string,
  designUrl: string,
  variants: PrintfulVariantInput[]
): Promise<{ id: number; external_id: string; name: string; thumbnail_url?: string }> {
  const externalId = `volcity_${userId}_${productId}`;

  const response = await fetch(`${PRINTFUL_API}/store/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      sync_product: {
        name: productName,
        external_id: externalId,
        thumbnail: designUrl,
      },
      sync_variants: variants.map((v) => ({
        variant_id: v.variantId,
        retail_price: v.retailPrice,
        files: [{ url: designUrl, type: 'default' }],
      })),
    }),
  });

  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Printful createProduct failed: non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    const msg = (data?.error as Record<string, unknown>)?.message
      || (data as Record<string, unknown>)?.result
      || response.status;
    console.error('[printful] createProduct error response:', JSON.stringify(data));
    throw new Error(`Printful createProduct failed: ${msg}`);
  }

  const result = data.result as { id?: number; external_id?: string; name?: string; thumbnail_url?: string } | undefined;
  if (!result?.id) {
    console.error('[printful] createProduct unexpected response shape:', JSON.stringify(data));
    throw new Error(`Printful createProduct: unexpected response shape — ${JSON.stringify(data).slice(0, 300)}`);
  }

  return result as { id: number; external_id: string; name: string; thumbnail_url?: string };
}

// ── 2. Fulfill order ──────────────────────────────────────────────────────────

/**
 * Sends an order to Printful for printing and shipping.
 * Filters items where fulfillment_type === 'printful'.
 * Returns the Printful order object (including Printful order ID).
 */
export async function fulfillOrder(order: PrintfulOrder): Promise<{ id: number; external_id: string } | null> {
  const printfulItems = order.items
    .filter((i) => i.fulfillment_type === 'printful')
    .map((i) => ({
      sync_variant_id: i.printful_variant_id,
      quantity: i.quantity,
    }));

  if (printfulItems.length === 0) {
    console.log('[printful] fulfillOrder: no printful items, skipping');
    return null;
  }

  const addr = order.shipping_address;

  const response = await fetch(`${PRINTFUL_API}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      external_id: `volcity_order_${order.id}`,
      shipping: order.shipping_method || 'STANDARD',
      recipient: {
        name: order.customer_name || 'Customer',
        address1: addr.line1,
        address2: addr.line2 || undefined,
        city: addr.city,
        state_code: addr.state,
        country_code: addr.country,
        zip: addr.zip,
      },
      items: printfulItems,
      confirm: true,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful fulfillOrder failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  return data.result;
}

// ── 3. Get product cost ───────────────────────────────────────────────────────

/**
 * Returns the base production cost (USD) for a Printful catalog variant.
 */
export async function getProductCost(catalogVariantId: number): Promise<number> {
  const response = await fetch(
    `${PRINTFUL_API}/products/variant/${catalogVariantId}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful getProductCost failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  return parseFloat(data.result?.price ?? '0');
}

// ── 4a. Get catalog product with variants ────────────────────────────────────

export type CatalogVariant = {
  id: number;
  name: string;
  size: string;
  color: string;
  color_code?: string;
  price: string;
  currency: string;
  in_stock: boolean;
};

export type CatalogProductDetail = {
  id: number;
  title: string;
  type: string;
  brand: string;
  model: string;
  thumbnail_url?: string;
  image?: string;
};

/**
 * Returns a single Printful catalog product with its full variant list.
 * Used to populate variant selection and get pricing during product creation.
 */
export async function getCatalogProduct(
  productId: number
): Promise<{ product: CatalogProductDetail; variants: CatalogVariant[] }> {
  const response = await fetch(`${PRINTFUL_API}/products/${productId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful getCatalogProduct failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  return data.result;
}

// ── 4. Get catalog products ───────────────────────────────────────────────────

/**
 * Lists available Printful catalog products (t-shirts, mugs, etc.).
 * Used for the product type selector in the store builder UI.
 */
export async function getCatalogProducts(categoryId?: string): Promise<unknown[]> {
  const url = categoryId
    ? `${PRINTFUL_API}/products?category_id=${encodeURIComponent(categoryId)}`
    : `${PRINTFUL_API}/products`;

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful getCatalogProducts failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  return data.result ?? [];
}

// ── 5. Get shipping rates ─────────────────────────────────────────────────────

/**
 * Gets real-time shipping rate options from Printful for a given recipient + items.
 * Returns array of shipping options with service name and price.
 */
export async function getShippingRates(
  recipient: ShippingRecipient,
  items: ShippingItem[]
): Promise<Array<{ id: string; name: string; rate: string; minDeliveryDays: number; maxDeliveryDays: number }>> {
  const response = await fetch(`${PRINTFUL_API}/shipping/rates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ recipient, items }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful getShippingRates failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  return (data.result ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    rate: r.rate as string,
    minDeliveryDays: r.minDeliveryDays as number,
    maxDeliveryDays: r.maxDeliveryDays as number,
  }));
}

// ── 6. Get sync products for a user ──────────────────────────────────────────

/**
 * Returns all sync products on the master account that belong to a given user
 * (identified by external_id prefix: volcity_${userId}_).
 */
export async function getUserSyncProducts(userId: string): Promise<unknown[]> {
  const response = await fetch(`${PRINTFUL_API}/sync/products?limit=100`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Printful getUserSyncProducts failed: ${err?.result || response.status}`);
  }

  const data = await response.json();
  const all: Array<{ external_id?: string }> = data.result ?? [];
  return all.filter((p) => p.external_id?.startsWith(`volcity_${userId}_`));
}

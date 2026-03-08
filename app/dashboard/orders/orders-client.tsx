"use client";

import { useState } from "react";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  site_id: string | null;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
};

function fmt(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        paid
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {paid ? "Paid" : status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((x) => !x)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors duration-150"
      >
        {/* Order ID */}
        <div className="font-mono text-xs text-slate-400 w-20 flex-shrink-0">
          #{shortId(order.id)}
        </div>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">
            {order.customer_email || "—"}
          </div>
          {order.site_id && (
            <div className="text-xs text-slate-400 truncate mt-0.5">
              Store: {order.site_id}
            </div>
          )}
        </div>

        {/* Items count */}
        <div className="text-xs text-slate-500 flex-shrink-0 hidden sm:block">
          {order.order_items.length} item
          {order.order_items.length !== 1 ? "s" : ""}
        </div>

        {/* Total */}
        <div className="text-sm font-semibold text-slate-900 flex-shrink-0 w-20 text-right">
          {fmt(Number(order.total))}
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusBadge status={order.status} />
        </div>

        {/* Date */}
        <div className="text-xs text-slate-400 flex-shrink-0 hidden md:block w-16 text-right">
          {timeAgo(order.created_at)}
        </div>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Order items
          </div>
          {order.order_items.length === 0 ? (
            <div className="text-sm text-slate-400">No items recorded.</div>
          ) : (
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-slate-700">{item.product_name}</span>
                    <span className="text-slate-400">× {item.quantity}</span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {fmt(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500">Order total</span>
            <span className="font-bold text-slate-900">{fmt(Number(order.total))}</span>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            Placed {new Date(order.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersClient({
  orders,
  stats,
}: {
  orders: Order[];
  stats: Stats;
}) {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Sales across all your published stores
        </p>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={fmt(stats.totalRevenue)}
          sub="Gross, before Stripe fees"
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders.toString()}
          sub="Completed payments"
        />
        <StatCard
          label="Avg Order Value"
          value={fmt(stats.avgOrderValue)}
          sub="Per completed order"
        />
      </div>

      {/* Payout explanation */}
      <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 flex gap-3">
        <svg
          className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
          />
        </svg>
        <div className="text-sm text-blue-800 leading-relaxed">
          <strong>How payouts work:</strong> Stripe collects payments from your
          customers and deposits funds directly into your connected bank account,
          typically within 2–7 business days depending on your country. Stripe
          charges a processing fee (usually 2.9% + 30¢ per transaction). You keep
          the rest — no platform cut from VentureOS.
        </div>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="text-center py-24 animate-fadeIn">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-slate-700 mb-2">
            No orders yet
          </div>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Orders will appear here once customers complete checkout on your
            published stores.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

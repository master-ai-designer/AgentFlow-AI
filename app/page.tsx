"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, ArrowUpRightFromSquare, Bot, Check,
  ChevronDown, CircleHelp, Command, CreditCard, Ellipsis, Filter, Headphones,
  LayoutDashboard, LifeBuoy, Menu, MessageSquareText, MoreHorizontal, Package,
  Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Store, TrendingUp,
  Users, WalletCards, X, Zap
} from "lucide-react";

type OrderStatus = "Paid" | "Processing" | "Pending" | "Refunded";
type Order = { id: string; customer: string; initials: string; item: string; date: string; amount: number; status: OrderStatus };

const initialOrders: Order[] = [
  { id: "AF-2048", customer: "Olivia Rhye", initials: "OR", item: "Studio headphones", date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date()), amount: 249, status: "Paid" },
  { id: "AF-2047", customer: "Phoenix Baker", initials: "PB", item: "Desk lamp · Matte black", date: "Oct 20, 2026", amount: 89, status: "Processing" },
  { id: "AF-2046", customer: "Lana Steiner", initials: "LS", item: "Everyday carry set", date: "Oct 19, 2026", amount: 136, status: "Pending" },
  { id: "AF-2045", customer: "Demi Wilkinson", initials: "DW", item: "Wireless keyboard", date: "Oct 19, 2026", amount: 179, status: "Paid" },
  { id: "AF-2044", customer: "Candice Wu", initials: "CW", item: "Ceramic pour-over kit", date: "Oct 18, 2026", amount: 64, status: "Refunded" }
];

const suggestions = [
  { title: "Summarize today's orders", detail: "Get a quick business snapshot", icon: Activity },
  { title: "Find pending payments", detail: "Spot orders that need attention", icon: WalletCards },
  { title: "Draft a customer follow-up", detail: "Write a helpful message", icon: MessageSquareText }
];

export default function Home() {
  const [orders, setOrders] = useState(initialOrders);
  const [orderQuery, setOrderQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [filter, setFilter] = useState("All orders");
  const [response, setResponse] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newAmount, setNewAmount] = useState("99");

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch = [order.id, order.customer, order.item].some((value) => value.toLowerCase().includes(orderQuery.toLowerCase()));
    const matchesFilter = filter === "All orders" || order.status === filter;
    return matchesSearch && matchesFilter;
  }), [orders, orderQuery, filter]);

  const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  const totalOrderValue = orders.filter((order) => order.status !== "Refunded").reduce((sum, order) => sum + order.amount, 0);
  const activeCustomerCount = new Set(orders.map((order) => order.customer.trim().toLowerCase()).filter(Boolean)).size;
  const customerRows = useMemo(() => {
    const grouped = new Map<string, Order[]>();
    for (const order of orders) {
      const key = order.customer.trim().toLowerCase();
      const records = grouped.get(key) ?? [];
      records.push(order);
      grouped.set(key, records);
    }
    return [...grouped.values()].map((records) => ({
      customer: records[0].customer,
      initials: records[0].initials,
      count: records.length,
      paidValue: records.filter((order) => order.status === "Paid").reduce((sum, order) => sum + order.amount, 0),
      latestDate: records[0].date
    })).filter((customer) => customer.customer.toLowerCase().includes(orderQuery.toLowerCase()));
  }, [orders, orderQuery]);

  async function runAssistant(prompt: string) {
    if (assistantLoading) return;
    setAssistantLoading(true);
    setResponse("");
    const localAnswer = (message: string) => {
      const lower = message.toLowerCase();
      if (lower.includes("pending") || lower.includes("payment")) {
        const pending = orders.filter((order) => order.status === "Pending");
        return pending.length
          ? `I found ${pending.length} order awaiting payment: ${pending.map((o) => `${o.id} for ${money(o.amount)} (${o.customer})`).join(", ")}. This is demo data; no payment provider has been contacted.`
          : "There are no orders marked pending in this demo workspace.";
      }
      if (lower.includes("summar") || lower.includes("today") || lower.includes("sales")) {
        const paid = orders.filter((order) => order.status === "Paid");
        return `Demo snapshot: ${orders.length} orders, ${paid.length} marked paid, and ${money(paid.reduce((sum, order) => sum + order.amount, 0))} in paid order value. These are sample figures, not live store analytics.`;
      }
      if (lower.includes("follow") || lower.includes("email") || lower.includes("customer")) {
        return "Draft only: “Hi there! Just checking in about your recent order. If you have any questions or need help, reply to this message and we'll be happy to help.” Nothing has been sent.";
      }
      if (lower.includes("refund")) {
        return "Before issuing a refund, verify the captured payment with PayPal and confirm the amount and approval. This prototype does not issue refunds.";
      }
      return "I can summarize orders, find pending payments, and draft customer follow-ups. This workspace is in demo mode; no external action is taken.";
    };

    try {
      const result = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          orders: orders.map((order) => ({ id: order.id, customer: order.customer, amount: order.amount, status: order.status }))
        })
      });
      const data = await result.json();
      if (!result.ok || typeof data.answer !== "string") throw new Error("Assistant API unavailable");
      setResponse(data.answer);
    } catch {
      setResponse(localAnswer(prompt) + " (Local demo fallback.)");
    }
    setAssistantLoading(false);
    setAssistantQuery("");
  }

  function addOrder() {
    const amount = Number(newAmount);
    if (!newCustomer.trim() || newCustomer.trim().length > 100 || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      setResponse("Enter a customer name (up to 100 characters) and an amount between $0.01 and $10,000.");
      return;
    }
    const initials = newCustomer.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const order: Order = {
      id: `AF-${2049 + orders.length - initialOrders.length}`,
      customer: newCustomer.trim(),
      initials: initials || "CU",
      item: "New custom order",
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date()),
      amount,
      status: "Pending"
    };
    setOrders((current) => [order, ...current]);
    setNewCustomer("");
    setNewAmount("99");
    setShowNewOrder(false);
    setResponse(`Created demo order ${order.id} for ${money(amount)}. It's marked pending. No PayPal payment has been created or charged.`);
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Orders", icon: Package, count: String(orders.length) },
    { label: "Customers", icon: Users },
    { label: "Payments", icon: CreditCard }
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.5} /></div>
          <span className="brand-name">agentflow<span>.ai</span></span>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={18} /></button>
        </div>
        <button className="workspace-switch">
          <div className="workspace-avatar">S</div>
          <div className="workspace-copy"><strong>Studio workspace</strong><span>Free plan · Demo mode</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} onClick={() => { setActiveNav(label); setMobileMenu(false); }} className={`nav-item ${activeNav === label ? "nav-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label nav-label-spaced">AUTOMATION</div>
        <button className={`nav-item ${activeNav === "AI assistant" ? "nav-active" : ""}`} onClick={() => { setActiveNav("AI assistant"); document.getElementById("assistant-input")?.focus(); }}><Bot size={18} /><span>AI assistant</span><span className="new-pill">NEW</span></button>
        <button className={`nav-item ${activeNav === "Integrations" ? "nav-active" : ""}`} onClick={() => setActiveNav("Integrations")}><Zap size={18} /><span>Integrations</span></button>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16} /></div><strong>Make busywork history.</strong><p>Let your AI teammate handle the repetitive stuff.</p><button onClick={() => setResponse("Automation recipes are coming soon. This prototype currently runs in demo mode.")}>Explore automations <ArrowUpRight size={14} /></button></div>
          <button className="nav-item" onClick={() => setActiveNav("Settings")}><Settings2 size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => setResponse("Help center: this is an early prototype. No live store or payment account is connected yet.")}><LifeBuoy size={18} /><span>Help & support</span></button>
          <div className="profile-row"><div className="profile-avatar">A</div><div className="profile-copy"><strong>Admin User</strong><span>admin@studio.demo</span></div><MoreHorizontal size={18} className="muted-icon" /></div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{activeNav}</strong></div></div>
          <div className="topbar-actions"><div className="status-indicator"><span /> All systems demo</div><button className="icon-button help-button" aria-label="Help" onClick={() => setResponse("AgentFlow AI is in demo mode. Orders are stored only in this page's temporary state.")}><CircleHelp size={18} /></button><div className="top-avatar">A</div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR BUSINESS, IN FLOW</div><h1>{activeNav === "Overview" ? <>Good morning, Admin <span className="wave">✳</span></> : activeNav}</h1><p>{activeNav === "Overview" ? "Here's what's happening with your business today." : activeNav === "Orders" ? "Review and filter your demo order records." : activeNav === "Customers" ? "Review customer activity from the demo orders." : activeNav === "Payments" ? "Review payment labels for demo orders; provider status is not connected." : activeNav === "AI assistant" ? "Ask questions about the sample order data." : activeNav === "Integrations" ? "Manage connections to external services." : "Review demo mode and workspace settings."}</p></div>
            <button className="primary-button" onClick={() => setShowNewOrder(true)}><Plus size={17} /> New order</button>
          </div>

          <div className="demo-notice"><div className="notice-icon"><ShieldCheck size={17} /></div><div><strong>You're exploring demo mode</strong><span>Sample data only. PayPal and live store connections aren't active yet.</span></div><span className="demo-tag">SANDBOX READY SOON</span></div>

          {activeNav !== "Integrations" && activeNav !== "Settings" ? (
          <>
          <div className="section-heading"><div><h2>{activeNav === "Customers" ? "Customer overview" : activeNav === "Payments" ? "Payment overview" : activeNav === "Orders" ? "Order overview" : "Business overview"}</h2><p>{activeNav === "Customers" ? "Customers represented in the current demo orders." : activeNav === "Payments" ? "Payment states shown for demo orders only." : "A quick look at your demo workspace."}</p></div><span className="period-button">Demo data <ChevronDown size={15} /></span></div>

          <div className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Total order value</span><span className="metric-icon purple"><WalletCards size={17} /></span></div><div className="metric-value">{money(totalOrderValue)}</div><div className="metric-foot">Compared to previous 7 days</div><div className="sparkline spark-purple"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="metric-card"><div className="metric-top"><span>Orders</span><span className="metric-icon blue"><Package size={17} /></span></div><div className="metric-value">{orders.length}</div><div className="metric-foot">Across all order statuses</div><div className="sparkline spark-blue"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="metric-card"><div className="metric-top"><span>Pending payments</span><span className="metric-icon amber"><CreditCard size={17} /></span></div><div className="metric-value">{orders.filter((order) => order.status === "Pending").length}<span className="metric-subtle">needs attention</span></div><div className="metric-foot">Review before fulfilling orders</div><div className="metric-progress"><span style={{ width: "32%" }} /></div></article>
            <article className="metric-card"><div className="metric-top"><span>Active customers</span><span className="metric-icon green"><Users size={17} /></span></div><div className="metric-value">{activeCustomerCount}</div><div className="metric-foot">Returning and new customers</div><div className="sparkline spark-green"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
          </div>

          <div className="content-grid">
            <section className="orders-card">
              <div className="card-heading"><div><h2>{activeNav === "Payments" ? "Payment activity" : activeNav === "Customers" ? "Recent customers" : "Recent orders"}</h2><p>Keep an eye on what needs your attention.</p></div>{activeNav === "Customers" ? <button className="text-button" onClick={() => setOrderQuery("")}>Clear search <X size={14} /></button> : <button className="text-button" onClick={() => { setActiveNav("Orders"); setFilter("All orders"); }}>View all <ArrowUpRightFromSquare size={14} /></button>}</div>
              <div className="table-toolbar"><div className="search-field"><Search size={16} /><input aria-label={activeNav === "Customers" ? "Search customers" : "Search orders"} placeholder={activeNav === "Customers" ? "Search customers..." : "Search orders..."} value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} /><kbd>⌘ K</kbd></div>{activeNav !== "Customers" && <><select aria-label="Filter by order status" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All orders</option><option>Paid</option><option>Processing</option><option>Pending</option><option>Refunded</option></select><button className="filter-button" aria-label="Toggle pending order filter" onClick={() => setFilter(filter === "All orders" ? "Pending" : "All orders")}><Filter size={16} /></button></>}</div>
              <div className="orders-table-wrap"><table className="orders-table"><thead>{activeNav === "Customers" ? <tr><th>CUSTOMER</th><th>ORDERS</th><th>PAID VALUE</th><th>LATEST ORDER</th></tr> : <tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>AMOUNT</th><th>STATUS</th><th /></tr>}</thead><tbody>
                {activeNav === "Customers" ? customerRows.map((customer) => <tr key={customer.customer.toLowerCase()}><td><div className="customer-cell"><span className="customer-avatar">{customer.initials}</span><span>{customer.customer}</span></div></td><td>{customer.count}</td><td><strong className="amount">{money(customer.paidValue)}</strong></td><td>{customer.latestDate}</td></tr>) : visibleOrders.map((order) => <tr key={order.id}><td><span className="order-id">{order.id}</span><span className="order-date">{order.date}</span></td><td><div className="customer-cell"><span className="customer-avatar">{order.initials}</span><span>{order.customer}</span></div></td><td><span className="item-name">{order.item}</span></td><td><strong className="amount">{money(order.amount)}</strong></td><td><span className={`status-badge status-${order.status.toLowerCase()}`}><i />{order.status}</span></td><td><button className="row-more" aria-label={`More options for ${order.id}`} onClick={() => setResponse(`${order.id}: ${order.customer} · ${money(order.amount)} · ${order.status}. Demo record only.`)}><Ellipsis size={18} /></button></td></tr>)}
                {((activeNav === "Customers" && customerRows.length === 0) || (activeNav !== "Customers" && visibleOrders.length === 0)) && <tr><td colSpan={activeNav === "Customers" ? 4 : 6} className="empty-state">No {activeNav === "Customers" ? "customers" : "orders"} match your search.</td></tr>}
              </tbody></table></div>
              <div className="table-footer"><span>Showing <strong>{activeNav === "Customers" ? customerRows.length : visibleOrders.length}</strong> of <strong>{activeNav === "Customers" ? customerRows.length : orders.length}</strong> demo {activeNav === "Customers" ? "customers" : "orders"}</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
            </section>

            <aside className="assistant-card">
              <div className="assistant-header"><div className="assistant-brand"><div className="assistant-mark"><Sparkles size={17} /></div><div><h2>Your AI teammate</h2><span><i /> Ready to help</span></div></div><button className="icon-button" aria-label="Assistant options" onClick={() => setResponse("AgentFlow AI assistant · Demo mode · No external actions enabled.")}><Ellipsis size={19} /></button></div>
              <div className="assistant-intro"><div className="assistant-orb"><Bot size={26} /></div><h3>What can I take off<br />your plate?</h3><p>Ask me about orders, payments, or customer follow-ups. Let's get things moving.</p></div>
              <div className="suggestion-list">{suggestions.map(({ title, detail, icon: Icon }) => <button className="suggestion-item" key={title} onClick={() => runAssistant(title)}><span className="suggestion-icon"><Icon size={16} /></span><span className="suggestion-copy"><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={15} className="suggestion-arrow" /></button>)}</div>
              {assistantLoading && <div className="assistant-response"><div><Activity size={14} /> AgentFlow is thinking…</div><p>Checking the demo order data.</p></div>}
              {response && <div className="assistant-response"><div><Sparkles size={14} /> AgentFlow response</div><p>{response}</p><button onClick={() => setResponse("")} aria-label="Dismiss response"><X size={14} /></button></div>}
              <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); if (assistantQuery.trim()) runAssistant(assistantQuery); }}><input id="assistant-input" value={assistantQuery} onChange={(event) => setAssistantQuery(event.target.value)} placeholder="Ask AgentFlow anything..." /><button type="submit" aria-label="Send message" disabled={!assistantQuery.trim() || assistantLoading}><Send size={16} /></button></form>
              <div className="assistant-disclaimer"><ShieldCheck size={13} /> Demo assistant · Review before taking action</div>
            </aside>
          </div>

          <div className="bottom-row"><div className="bottom-card"><div className="bottom-icon"><Store size={18} /></div><div><strong>Connect your store</strong><p>Bring your orders into one workspace.</p></div><button onClick={() => { setActiveNav("Integrations"); setResponse(""); }}>Set up <ArrowUpRight size={14} /></button></div><div className="bottom-card"><div className="bottom-icon paypal-icon"><WalletCards size={18} /></div><div><strong>PayPal payments</strong><p>Sandbox API routes are available but not connected to checkout.</p></div><span className="coming-soon">NOT CONNECTED</span></div><div className="bottom-card"><div className="bottom-icon green"><TrendingUp size={18} /></div><div><strong>Smart workflows</strong><p>Automations are not active in this demo.</p></div><span className="coming-soon">PLANNED</span></div></div>
          </>
          ) : activeNav === "Integrations" ? (
            <section className="workspace-panel">
              <div className="section-heading"><div><h2>Integrations</h2><p>Connect external services when you're ready to configure credentials.</p></div></div>
              <div className="bottom-row">
                <article className="bottom-card"><div className="bottom-icon paypal-icon"><WalletCards size={18} /></div><div><strong>PayPal Sandbox</strong><p>Server routes exist; credentials and checkout UI are not connected.</p><span className="coming-soon">NOT CONFIGURED</span></div></article>
                <article className="bottom-card"><div className="bottom-icon"><Store size={18} /></div><div><strong>Store platform</strong><p>No Shopify, WooCommerce, or live store connection is configured.</p><span className="coming-soon">NOT CONNECTED</span></div></article>
                <article className="bottom-card"><div className="bottom-icon green"><Bot size={18} /></div><div><strong>AI provider</strong><p>The assistant currently uses deterministic rules, not a live LLM.</p><span className="coming-soon">RULE-BASED</span></div></article>
              </div>
              <div className="assistant-response"><div><ShieldCheck size={14} /> Safe setup</div><p>When configuring PayPal, add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel Project Settings → Environment Variables. Never paste secrets into GitHub or this chat. Keep the environment set to Sandbox for testing.</p></div>
            </section>
          ) : (
            <section className="workspace-panel">
              <div className="section-heading"><div><h2>Settings</h2><p>Prototype configuration and demo-data controls.</p></div></div>
              <div className="bottom-row">
                <article className="bottom-card"><div className="bottom-icon"><ShieldCheck size={18} /></div><div><strong>Workspace mode</strong><p>Demo mode only. No login, roles, or live-store data are configured.</p><span className="coming-soon">DEMO</span></div></article>
                <article className="bottom-card"><div className="bottom-icon"><Package size={18} /></div><div><strong>Data storage</strong><p>Orders live in page memory and reset when you refresh.</p><span className="coming-soon">TEMPORARY</span></div></article>
                <article className="bottom-card"><div className="bottom-icon green"><ShieldCheck size={18} /></div><div><strong>Payment safety</strong><p>Live PayPal mode is intentionally blocked in this prototype.</p><span className="coming-soon">SANDBOX ONLY</span></div></article>
              </div>
              <div className="assistant-response"><div><Activity size={14} /> Demo workspace</div><p>Resetting restores the original sample orders. This does not affect PayPal or any external account.</p><button className="secondary-button" style={{ position: "static", marginTop: "10px" }} onClick={() => { setOrders(initialOrders); setOrderQuery(""); setFilter("All orders"); setResponse("Demo orders restored to the original sample set."); }}>Reset demo orders</button></div>
            </section>
          )}
          <footer className="footer"><span>© 2026 AgentFlow AI</span><span><span className="footer-dot" /> Built for better business flow</span><button onClick={() => setResponse("AgentFlow AI is a hackathon prototype in active development.")}>Feedback</button></footer>
        </div>
      </section>

      {showNewOrder && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewOrder(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-order-title"><div className="modal-heading"><div><h2 id="new-order-title">Create a demo order</h2><p>This only adds a sample record to this page.</p></div><button className="icon-button" onClick={() => setShowNewOrder(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={(event) => { event.preventDefault(); addOrder(); }}><label>Customer name<input autoFocus required value={newCustomer} onChange={(event) => setNewCustomer(event.target.value)} placeholder="e.g. Alex Morgan" /></label><label>Order amount (USD)<input required min="0.01" max="10000" step="0.01" type="number" value={newAmount} onChange={(event) => setNewAmount(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewOrder(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Create order</button></div></form></section></div>}
    </main>
  );
}

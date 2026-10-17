"use client";

import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleHelp,
  Clock3,
  Coins,
  ExternalLink,
  FileText,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import type { AssetSearchResult, MarketSnapshot } from "@/lib/market/types";

type PaperTrade = {
  id: string;
  asset_symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  created_at: string;
};

type AuthState = {
  mode: "demo" | "supabase";
  user: { email: string | null } | null;
};

type Position = {
  symbol: string;
  quantity: number;
  averageCost: number;
  realizedPnl: number;
  lastTradePrice: number;
  updatedAt: string;
};

const INITIAL_CASH = 100_000;
const demoStorageKey = "signaldesk-paper-trades-v1";

function formatCurrency(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function parseTradeRows(value: unknown): PaperTrade[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PaperTrade =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.asset_symbol === "string" &&
      (item.side === "buy" || item.side === "sell") &&
      Number.isFinite(Number(item.quantity)) &&
      Number.isFinite(Number(item.price)) &&
      typeof item.created_at === "string",
  ).map((trade) => ({
    ...trade,
    quantity: Number(trade.quantity),
    price: Number(trade.price),
  }));
}

function calculatePositions(trades: PaperTrade[]): Position[] {
  const positions = new Map<string, Position>();
  const chronological = [...trades].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );

  for (const trade of chronological) {
    const current = positions.get(trade.asset_symbol) ?? {
      symbol: trade.asset_symbol,
      quantity: 0,
      averageCost: 0,
      realizedPnl: 0,
      lastTradePrice: trade.price,
      updatedAt: trade.created_at,
    };
    current.lastTradePrice = trade.price;
    current.updatedAt = trade.created_at;

    if (trade.side === "buy") {
      const nextQuantity = current.quantity + trade.quantity;
      current.averageCost =
        (current.quantity * current.averageCost + trade.quantity * trade.price) /
        nextQuantity;
      current.quantity = nextQuantity;
    } else {
      current.realizedPnl +=
        (trade.price - current.averageCost) * trade.quantity;
      current.quantity = Math.max(0, current.quantity - trade.quantity);
      if (current.quantity === 0) current.averageCost = 0;
    }
    positions.set(trade.asset_symbol, current);
  }

  return [...positions.values()]
    .filter((position) => position.quantity > 0.000001)
    .sort((left, right) => right.quantity - left.quantity);
}

function getStoredTrades(): PaperTrade[] {
  const stored = window.localStorage.getItem(demoStorageKey);
  if (!stored) return [];

  try {
    return parseTradeRows(JSON.parse(stored));
  } catch {
    console.error("[portfolio] Saved browser demo history could not be read.");
    window.localStorage.removeItem(demoStorageKey);
    throw new Error("Saved demo history was unreadable and has been cleared.");
  }
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent?: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <article className="metric-card">
      <div className="metric-heading">
        <span>{label}</span>
        <span className={`metric-icon ${accent}`}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function AuthDialog({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (user: AuthState["user"]) => void;
}) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        isSignup ? "/api/auth/signup" : "/api/auth/signin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Account request failed.");

      if (isSignup && result.emailConfirmationRequired) {
        setMessage("Account created. Check your inbox to confirm your email.");
        setPassword("");
        return;
      }
      onAuthenticated(result.user ?? null);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Account request failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="auth-title"
        aria-modal="true"
        className="auth-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-topline">
          <div className="brand-mark small">
            <Activity size={17} strokeWidth={2.6} />
          </div>
          <button aria-label="Close" className="dialog-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <p className="eyebrow">PRIVATE PAPER PORTFOLIO</p>
        <h2 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="dialog-copy">
          Your paper-trading history is saved privately to your account.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Email address
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="primary-button full" disabled={pending} type="submit">
            {pending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <LockKeyhole size={16} />
            )}
            {pending
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Sign in securely"}
          </button>
        </form>
        <div className="auth-switch">
          {isSignup ? "Already registered?" : "New to SignalDesk?"}{" "}
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
              setMessage("");
            }}
            type="button"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </div>
        <p className="fine-print">
          Account credentials are handled by Supabase Auth and are never stored
          in this app&apos;s portfolio tables.
        </p>
      </section>
    </div>
  );
}

export default function TradingDashboard() {
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("auth") === "failed";
  const [symbol, setSymbol] = useState("NVDA");
  const [assetName, setAssetName] = useState("NVIDIA Corporation");
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [marketError, setMarketError] = useState("");
  const [marketLoading, setMarketLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [range, setRange] = useState<"1M" | "3M" | "ALL">("3M");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [tradePending, setTradePending] = useState(false);
  const [tradeMessage, setTradeMessage] = useState("");
  const [tradeError, setTradeError] = useState(
    () => authFailed
      ? "Email confirmation could not be completed. Please sign in again or check your Supabase redirect URL."
      : "",
  );
  const [explanation, setExplanation] = useState<{
    mode: "ai" | "rules";
    provider: string;
    summary: string;
    inputs: string[];
    notice: string;
  } | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const positions = useMemo(() => calculatePositions(trades), [trades]);
  const cash = useMemo(
    () =>
      trades.reduce(
        (total, trade) =>
          total +
          (trade.side === "buy" ? -1 : 1) * trade.quantity * trade.price,
        INITIAL_CASH,
      ),
    [trades],
  );

  const loadTrades = useCallback(async (mode: AuthState["mode"], userPresent: boolean) => {
    setTradesLoading(true);
    try {
      if (mode === "demo") {
        setTrades(getStoredTrades());
      } else if (userPresent) {
        const response = await fetch("/api/trades");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Portfolio could not be loaded.");
        setTrades(parseTradeRows(result.trades));
      } else {
        setTrades([]);
      }
    } catch (error) {
      setTrades([]);
      setTradeError(
        error instanceof Error
          ? error.message
          : "Portfolio could not be loaded. Please refresh.",
      );
    } finally {
      setTradesLoading(false);
    }
  }, []);

  function selectAsset(asset: AssetSearchResult) {
    if (asset.symbol !== symbol) {
      setSymbol(asset.symbol);
      setAssetName(asset.name);
      setMarketLoading(true);
      setMarketError("");
      setSnapshot(null);
      setExplanation(null);
      setExplanationError("");
    }
    setSearchText("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/market?symbol=${encodeURIComponent(symbol)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Market data could not be loaded.");
        return result as MarketSnapshot;
      })
      .then(setSnapshot)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMarketError(
          error instanceof Error
            ? error.message
            : "Market data could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setMarketLoading(false);
      });
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    const controller = new AbortController();
    if (searchText.trim().length < 2) {
      return () => controller.abort();
    }

    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/market/search?query=${encodeURIComponent(searchText.trim())}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "Search is unavailable.");
          return result.results as AssetSearchResult[];
        })
        .then((results) => {
          setSearchResults(results);
          setSearchError("");
          setSearchLoading(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearchLoading(false);
          setSearchError(
            error instanceof Error ? error.message : "Search is unavailable.",
          );
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchText]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Session could not be checked.");
        return result as AuthState;
      })
      .then((session) => {
        setAuth(session);
        return loadTrades(session.mode, Boolean(session.user));
      })
      .catch((error: unknown) => {
        setAuth(null);
        setTrades([]);
        setTradesLoading(false);
        setTradeError(
          error instanceof Error
            ? error.message
            : "Account session could not be checked.",
        );
      });
  }, [loadTrades]);

  const visiblePoints = useMemo(() => {
    if (!snapshot) return [];
    const count = range === "1M" ? 22 : range === "3M" ? 66 : 100;
    return snapshot.points.slice(-count);
  }, [range, snapshot]);

  const portfolioValue = useMemo(
    () =>
      cash +
      positions.reduce((total, position) => {
        const markPrice =
          position.symbol === symbol && snapshot
            ? snapshot.price
            : position.lastTradePrice;
        return total + position.quantity * markPrice;
      }, 0),
    [cash, positions, snapshot, symbol],
  );

  async function explainAsset() {
    setExplanationLoading(true);
    setExplanationError("");
    setExplanation(null);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Explanation could not be generated.");
      setExplanation(result);
    } catch (error) {
      setExplanationError(
        error instanceof Error
          ? error.message
          : "Explanation could not be generated. Please try again.",
      );
    } finally {
      setExplanationLoading(false);
    }
  }

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    const parsedQuantity = Number(quantity);
    setTradePending(true);
    setTradeError("");
    setTradeMessage("");

    try {
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Enter a quantity greater than zero.");
      }
      if (Number(parsedQuantity.toFixed(6)) !== parsedQuantity) {
        throw new Error("Quantity can have at most 6 decimal places.");
      }
      if (auth?.mode === "supabase" && !auth.user) {
        setAuthOpen(true);
        throw new Error("Sign in to save trades to your private portfolio.");
      }

      if (auth?.mode === "demo") {
        const estimatedCash =
          cash +
          (tradeSide === "buy" ? -1 : 1) * parsedQuantity * snapshot.price;
        const holding = positions.find((item) => item.symbol === symbol);
        if (tradeSide === "buy" && estimatedCash < 0) {
          throw new Error("This buy would exceed the $100,000 virtual cash balance.");
        }
        if (tradeSide === "sell" && (!holding || holding.quantity < parsedQuantity)) {
          throw new Error("You do not hold enough shares to record this paper sale.");
        }

        const trade: PaperTrade = {
          id: crypto.randomUUID(),
          asset_symbol: symbol,
          side: tradeSide,
          quantity: parsedQuantity,
          price: snapshot.price,
          created_at: new Date().toISOString(),
        };
        const nextTrades = [trade, ...trades];
        window.localStorage.setItem(demoStorageKey, JSON.stringify(nextTrades));
        setTrades(nextTrades);
      } else {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            side: tradeSide,
            quantity: parsedQuantity,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Paper trade was not recorded.");
        setTrades((current) => [result.trade as PaperTrade, ...current]);
      }

      setTradeMessage(
        `${tradeSide === "buy" ? "Paper buy" : "Paper sale"} of ${formatNumber(parsedQuantity, parsedQuantity % 1 === 0 ? 0 : 4)} ${symbol} recorded at ${formatCurrency(snapshot.price)}.`,
      );
    } catch (error) {
      setTradeError(
        error instanceof Error
          ? error.message
          : "Paper trade could not be recorded.",
      );
    } finally {
      setTradePending(false);
    }
  }

  async function signOut() {
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) {
        setTradeError("Sign out failed. Please try again.");
        return;
      }
      const nextAuth = { mode: "supabase" as const, user: null };
      setAuth(nextAuth);
      await loadTrades(nextAuth.mode, false);
    } catch {
      setTradeError("Sign out failed. Please check your connection and try again.");
    }
  }

  function handleAuthenticated(user: AuthState["user"]) {
    const nextAuth = { mode: "supabase" as const, user };
    setAuth(nextAuth);
    void loadTrades(nextAuth.mode, true);
  }

  const positiveDay = (snapshot?.changePercent ?? 0) >= 0;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <Activity size={18} strokeWidth={2.7} />
          </div>
          <div>
            <div className="brand-name">signal<span>desk</span></div>
            <div className="brand-caption">MARKET LEARNING STUDIO</div>
          </div>
          <button
            aria-label="Close navigation"
            className="mobile-close"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="primary-nav">
          <a className="nav-link active" href="#overview" onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard size={17} />
            <span>Overview</span>
            <span className="nav-active-dot" />
          </a>
          <a className="nav-link" href="#analysis" onClick={() => setMobileNavOpen(false)}>
            <BarChart3 size={17} />
            <span>Market analysis</span>
          </a>
          <a className="nav-link" href="#portfolio" onClick={() => setMobileNavOpen(false)}>
            <Wallet size={17} />
            <span>Paper portfolio</span>
          </a>
          <a className="nav-link" href="#methodology" onClick={() => setMobileNavOpen(false)}>
            <FileText size={17} />
            <span>Methodology</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div>
              <strong>New to indicators?</strong>
              <span>Learn the basics in our guide.</span>
              <a href="#methodology">Read the guide <ArrowRight size={13} /></a>
            </div>
          </div>
          <div className="sidebar-profile">
            <div className="avatar">{auth?.user?.email?.[0]?.toUpperCase() ?? "S"}</div>
            <div className="profile-copy">
              <strong>{auth?.user?.email ?? (auth ? "Student workspace" : "Connecting…")}</strong>
              <span>{auth?.mode === "supabase" ? "Private account" : auth?.mode === "demo" ? "Browser demo" : "Session unavailable"}</span>
            </div>
            {auth?.user ? (
              <button
                aria-label="Sign out"
                className="signout-button"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            ) : auth?.mode === "supabase" ? (
              <button
                aria-label="Sign in"
                className="signout-button"
                onClick={() => setAuthOpen(true)}
                title="Sign in"
              >
                <LockKeyhole size={15} />
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-slash">/</span>
            <strong>Market overview</strong>
          </div>
          <div className="topbar-actions">
            <div className="market-status">
              <span className="status-dot" />
              <span>Learning mode</span>
            </div>
            {auth?.mode === "supabase" && !auth.user && (
              <button className="top-signin" onClick={() => setAuthOpen(true)}>
                <LockKeyhole size={15} /> Sign in
              </button>
            )}
            {auth?.mode === "supabase" && auth.user && (
              <div className="signed-in-chip">
                <Check size={14} /> Account connected
              </div>
            )}
            {auth === null && (
              <button className="top-signin" onClick={() => window.location.reload()}>
                Retry session
              </button>
            )}
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-intro">
            <div>
              <div className="eyebrow">A CLEARER VIEW OF THE MARKET</div>
              <h1>Market overview</h1>
              <p>Learn from market data, understand the signals, and practice with zero real-world risk.</p>
            </div>
            <label className="asset-search">
              <Search size={17} />
              <input
                aria-label="Search supported market assets"
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setSearchResults([]);
                  setSearchError("");
                  setSearchLoading(false);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    selectAsset(searchResults[0]);
                  }
                }}
                placeholder="Search symbol or company"
                value={searchText}
              />
              {searchOpen && searchText.trim().length > 0 && (
                <div className="search-popover">
                  {searchResults.map((asset) => (
                    <button
                      key={asset.symbol}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        selectAsset(asset);
                      }}
                    >
                      <span className="search-symbol">{asset.symbol}</span>
                      <span className="search-name">{asset.name}</span>
                      <span className="search-type">{asset.type}</span>
                    </button>
                  ))}
                  {!searchResults.length && !searchError && (
                    <div className="search-empty">
                      {searchLoading ? (
                        <><LoaderCircle className="spin" size={15} /> Searching assets…</>
                      ) : (
                        <>No matching assets. Try a supported stock or ETF symbol.</>
                      )}
                    </div>
                  )}
                  {searchError && <div className="search-empty">{searchError}</div>}
                  {searchText.trim().length === 1 && (
                    <div className="search-empty">Type at least 2 characters to search.</div>
                  )}
                </div>
              )}
            </label>
          </section>

          <section aria-label="Educational simulation notice" className="notice-banner">
            <div className="notice-icon"><ShieldAlert size={17} /></div>
            <div>
              <strong>Education only — no real orders are placed.</strong>
              <span>Signals and AI explanations are uncertain observations, not financial advice.</span>
            </div>
            <a href="#methodology">How it works <ArrowRight size={14} /></a>
          </section>

          <section className="asset-heading">
            <div className="asset-title-wrap">
              <div className="asset-symbol-icon">{symbol.slice(0, 1)}</div>
              <div>
                <div className="asset-name-line">
                  <h2>{snapshot && snapshot.asset.name !== symbol ? snapshot.asset.name : assetName}</h2>
                  <span className="ticker-pill">{symbol}</span>
                </div>
                <p>
                  {snapshot?.source.mode === "demo"
                    ? "Simulated market series"
                    : snapshot?.source.mode === "live"
                      ? "Daily market data"
                      : "Market data loading"}
                  <span className="dot-divider">·</span>
                  {snapshot?.source.asOf
                    ? `Last data point ${new Date(`${snapshot.source.asOf}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Select an asset to begin"}
                </p>
              </div>
            </div>
            <div className="source-status">
              {snapshot?.source.mode === "demo" ? (
                <span className="source-badge demo"><span /> DEMO DATA</span>
              ) : snapshot?.source.mode === "live" ? (
                <span className="source-badge live"><span /> PROVIDER DATA</span>
              ) : (
                <span className="source-badge waiting"><span /> WAITING</span>
              )}
              <span className="source-name">
                {snapshot?.source.provider ?? "Connect a market-data key for live history"}
              </span>
            </div>
          </section>

          {snapshot?.source.stale && (
            <div className="stale-banner">
              <Clock3 size={15} />
              This market history may be stale. Verify the timestamp before using it.
            </div>
          )}
          {marketError && (
            <div className="error-banner" role="alert">
              <ShieldAlert size={16} /> {marketError}
            </div>
          )}

          <section aria-label="Market statistics" className="metrics-grid">
            <MetricCard
              accent="blue"
              detail={snapshot?.source.mode === "demo" ? "Synthetic sample · USD" : "Latest daily close · USD"}
              icon={<Coins size={17} />}
              label="Latest price"
              value={snapshot ? formatCurrency(snapshot.price) : marketLoading ? "Loading…" : "—"}
            />
            <MetricCard
              accent={positiveDay ? "green" : "amber"}
              detail="Change vs. previous daily close"
              icon={positiveDay ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
              label="Daily change"
              value={snapshot ? `${positiveDay ? "+" : ""}${snapshot.changePercent.toFixed(2)}%` : "—"}
            />
            <MetricCard
              accent="violet"
              detail="Simple average of the last 20 closes"
              icon={<Activity size={17} />}
              label="20-day average"
              value={snapshot?.indicators.sma20 !== null && snapshot?.indicators.sma20 !== undefined
                ? formatCurrency(snapshot.indicators.sma20)
                : "Not available"}
            />
            <MetricCard
              accent="amber"
              detail="Momentum measure · 0–100 scale"
              icon={<Gauge size={17} />}
              label="14-day RSI"
              value={snapshot?.indicators.rsi14 !== null && snapshot?.indicators.rsi14 !== undefined
                ? formatNumber(snapshot.indicators.rsi14, 1)
                : "Not available"}
            />
          </section>
          {snapshot && (
            <div aria-label="Additional market statistics" className="market-summary-strip">
              <span><strong>Series high</strong> {formatCurrency(snapshot.stats.high)}</span>
              <span><strong>Series low</strong> {formatCurrency(snapshot.stats.low)}</span>
              <span><strong>Avg. daily volume</strong> {formatNumber(snapshot.stats.averageVolume / 1_000_000, 1)}M</span>
            </div>
          )}

          <section className="analysis-grid" id="analysis">
            <article className="panel chart-panel">
              <div className="panel-header chart-header">
                <div>
                  <div className="panel-title">Price history</div>
                  <div className="panel-subtitle">Daily closing prices · USD</div>
                </div>
                <div aria-label="Chart time range" className="range-switch">
                  {(["1M", "3M", "ALL"] as const).map((item) => (
                    <button
                      aria-pressed={range === item}
                      className={range === item ? "selected" : ""}
                      key={item}
                      onClick={() => setRange(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-legend">
                <span className="legend-dot price" /> Daily close
                <span className="legend-source">
                  {snapshot?.source.mode === "demo" ? "Synthetic demo series" : "Historical observations"}
                </span>
              </div>
              <div className="chart-area">
                {marketLoading ? (
                  <div className="chart-state"><LoaderCircle className="spin" /> Loading price history…</div>
                ) : marketError || !visiblePoints.length ? (
                  <div className="chart-state empty"><BarChart3 size={25} /> Price history will appear when data is available.</div>
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={visiblePoints} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4267ea" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#4267ea" stopOpacity={0.015} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="date"
                        tickFormatter={(date: string) =>
                          new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        }
                        tick={{ fill: "#9199a8", fontSize: 11 }}
                        tickLine={false}
                        tickMargin={12}
                        minTickGap={28}
                      />
                      <YAxis
                        axisLine={false}
                        domain={["dataMin - 4", "dataMax + 4"]}
                        tick={{ fill: "#9199a8", fontSize: 11 }}
                        tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                        tickLine={false}
                        tickMargin={10}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          border: "1px solid #e7eaf0",
                          borderRadius: 10,
                          boxShadow: "0 12px 30px #18223b12",
                          fontSize: 12,
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), "Daily close"]}
                        labelFormatter={(date) =>
                          new Date(`${String(date)}T12:00:00`).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        }
                      />
                      <Area
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#4267ea" }}
                        dataKey="close"
                        fill="url(#price-fill)"
                        isAnimationActive={false}
                        stroke="#4267ea"
                        strokeWidth={2.2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="chart-footnote">
                <span><Clock3 size={13} /> As of {snapshot?.source.asOf ?? "—"}</span>
                <span>Price chart is for learning, not execution.</span>
              </div>
            </article>

            <article className="panel insight-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">AI market note</div>
                  <div className="panel-subtitle">Plain-language context for this asset</div>
                </div>
                <div className="ai-icon"><Sparkles size={16} /></div>
              </div>
              <div className="insight-content">
                {explanationLoading ? (
                  <div className="insight-state"><LoaderCircle className="spin" size={18} /> Reviewing the available data…</div>
                ) : explanation ? (
                  <>
                    <div className={`explanation-label ${explanation.mode}`}>
                      <span /> {explanation.provider}
                    </div>
                    <p className="insight-summary">{explanation.summary}</p>
                    <div className="input-list">
                      <strong>Inputs considered</strong>
                      {explanation.inputs.map((input) => (
                        <span key={input}><Check size={13} /> {input}</span>
                      ))}
                    </div>
                    <p className="insight-disclaimer">{explanation.notice}</p>
                  </>
                ) : (
                  <>
                    <div className="explanation-label idle"><span /> READY WHEN YOU ARE</div>
                    <div className="insight-placeholder">
                      <div className="sparkle-orbit"><Sparkles size={21} /></div>
                      <strong>Make the numbers easier to understand.</strong>
                      <span>Get a short explanation tied to the indicators and price data shown here.</span>
                    </div>
                    {explanationError && <div className="inline-error">{explanationError}</div>}
                    <button
                      className="outline-button explain-button"
                      disabled={!snapshot || explanationLoading}
                      onClick={explainAsset}
                    >
                      <Sparkles size={15} /> Explain this asset
                    </button>
                  </>
                )}
                {explanation && (
                  <button
                    className="text-button refresh-explanation"
                    disabled={explanationLoading}
                    onClick={explainAsset}
                  >
                    Generate another explanation <ArrowRight size={14} />
                  </button>
                )}
              </div>
              <div className="insight-footer">
                <ShieldAlert size={14} />
                <span>Not a forecast. AI can be wrong. Never trade on this alone.</span>
              </div>
            </article>
          </section>

          <section aria-labelledby="indicators-heading" className="panel indicator-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title" id="indicators-heading">Indicator snapshot</div>
                <div className="panel-subtitle">Transparent methods applied to the daily close series</div>
              </div>
              <a className="quiet-link" href="#methodology">View methodology <ArrowRight size={14} /></a>
            </div>
            <div className="indicator-row">
              <div className="indicator-item">
                <div className="indicator-icon blue-bg"><Activity size={16} /></div>
                <div className="indicator-copy">
                  <strong>20-day SMA</strong>
                  <span>Short-term price average</span>
                </div>
                <div className="indicator-number">{snapshot?.indicators.sma20 ? formatCurrency(snapshot.indicators.sma20) : "—"}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-icon purple-bg"><BarChart3 size={16} /></div>
                <div className="indicator-copy">
                  <strong>50-day SMA</strong>
                  <span>Longer-term price average</span>
                </div>
                <div className="indicator-number">{snapshot?.indicators.sma50 ? formatCurrency(snapshot.indicators.sma50) : "—"}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-icon amber-bg"><Gauge size={16} /></div>
                <div className="indicator-copy">
                  <strong>14-day RSI</strong>
                  <span>Recent momentum context</span>
                </div>
                <div className="indicator-number">{snapshot?.indicators.rsi14 !== null && snapshot?.indicators.rsi14 !== undefined ? `${snapshot.indicators.rsi14.toFixed(1)} / 100` : "—"}</div>
              </div>
            </div>
            <div className="method-note">
              <CircleHelp size={15} />
              <span>For learning only: moving averages and RSI summarize past prices. They do not predict performance or guarantee outcomes.</span>
            </div>
          </section>

          <section aria-labelledby="portfolio-heading" className="portfolio-section" id="portfolio">
            <div className="section-heading">
              <div>
                <div className="eyebrow">PRACTICE WITH NO REAL MONEY</div>
                <h2 id="portfolio-heading">Paper portfolio</h2>
                <p>Record hypothetical orders and review how your decisions would have played out.</p>
              </div>
              <span className="paper-chip"><span /> PAPER TRADING</span>
            </div>

            <div className="portfolio-summary">
              <div className="portfolio-value-card">
                <div className="portfolio-value-top">
                  <div className="portfolio-mini-icon"><Wallet size={18} /></div>
                  <span>ESTIMATED PORTFOLIO VALUE</span>
                  <span className="hypothetical-pill">HYPOTHETICAL</span>
                </div>
                <strong>{formatCurrency(portfolioValue)}</strong>
                <div className="portfolio-value-bottom">
                  <span>Starting virtual cash: {formatCurrency(INITIAL_CASH, 0)}</span>
                  <span>Cash available {formatCurrency(cash)}</span>
                </div>
              </div>

              <div className="trade-form-card">
                <div className="trade-card-heading">
                  <div>
                    <strong>Record a paper trade</strong>
                    <span>{symbol} · {snapshot ? formatCurrency(snapshot.price) : "Price loading"}</span>
                  </div>
                  <div className="trade-tabs">
                    <button
                      aria-pressed={tradeSide === "buy"}
                      className={tradeSide === "buy" ? "buy selected" : "buy"}
                      onClick={() => setTradeSide("buy")}
                      type="button"
                    >Buy</button>
                    <button
                      aria-pressed={tradeSide === "sell"}
                      className={tradeSide === "sell" ? "sell selected" : "sell"}
                      onClick={() => setTradeSide("sell")}
                      type="button"
                    >Sell</button>
                  </div>
                </div>
                <form className="trade-form" onSubmit={submitTrade}>
                  <label className="quantity-field">
                    <span>SHARES</span>
                    <input
                      inputMode="decimal"
                      min="0.000001"
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      step="any"
                      type="number"
                      value={quantity}
                    />
                  </label>
                  <div className="trade-estimate">
                    <span>ESTIMATED TOTAL</span>
                    <strong>{formatCurrency((Number(quantity) || 0) * (snapshot?.price ?? 0))}</strong>
                  </div>
                  <button
                    className={`trade-submit ${tradeSide}`}
                    disabled={tradePending || !snapshot || tradesLoading}
                    type="submit"
                  >
                    {tradePending ? <LoaderCircle className="spin" size={17} /> : tradeSide === "buy" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {tradePending ? "Recording…" : `${tradeSide === "buy" ? "Record paper buy" : "Record paper sale"}`}
                  </button>
                </form>
                {tradeMessage && <div className="trade-feedback success"><Check size={14} /> {tradeMessage}</div>}
                {tradeError && <div className="trade-feedback error" role="alert"><ShieldAlert size={14} /> {tradeError}</div>}
                {auth?.mode === "supabase" && !auth.user && (
                  <div className="auth-required"><LockKeyhole size={14} /> Sign in to save trades to your private account.</div>
                )}
              </div>
            </div>

            <div className="portfolio-tables">
              <article className="panel table-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Open positions</div>
                    <div className="panel-subtitle">{positions.length} assets in your hypothetical portfolio</div>
                  </div>
                  <div className="table-symbol-count"><Coins size={14} /> {positions.length} holdings</div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>ASSET</th><th>SHARES</th><th>AVG. COST</th><th>LAST PRICE</th><th>UNREALIZED P&amp;L*</th></tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const mark = position.symbol === symbol && snapshot
                          ? snapshot.price
                          : position.lastTradePrice;
                        const pnl = (mark - position.averageCost) * position.quantity;
                        return (
                          <tr key={position.symbol}>
                            <td><span className="table-asset-symbol">{position.symbol.slice(0, 1)}</span><strong>{position.symbol}</strong></td>
                            <td>{formatNumber(position.quantity, position.quantity % 1 === 0 ? 0 : 4)}</td>
                            <td>{formatCurrency(position.averageCost)}</td>
                            <td>{formatCurrency(mark)}</td>
                            <td className={pnl >= 0 ? "positive-text" : "negative-text"}>
                              {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                            </td>
                          </tr>
                        );
                      })}
                      {!positions.length && (
                        <tr><td className="empty-table" colSpan={5}>
                          {tradesLoading ? <><LoaderCircle className="spin" size={16} /> Loading portfolio…</> : <>No open positions yet. Record a hypothetical buy to get started.</>}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footnote">*Portfolio positions use the latest selected daily close when available; otherwise the last recorded fill. Values are estimates.</div>
              </article>

              <article className="panel table-panel history-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Recent activity</div>
                    <div className="panel-subtitle">Your latest practice decisions</div>
                  </div>
                  <Clock3 size={16} className="muted-icon" />
                </div>
                <div className="activity-list">
                  {trades.slice(0, 5).map((trade) => (
                    <div className="activity-row" key={trade.id}>
                      <div className={`activity-icon ${trade.side}`}>
                        {trade.side === "buy" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="activity-copy">
                        <strong>{trade.side === "buy" ? "Paper buy" : "Paper sale"} <span>{trade.asset_symbol}</span></strong>
                        <span>{new Date(trade.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      <div className="activity-amount">
                        <strong>{formatCurrency(trade.quantity * trade.price)}</strong>
                        <span>{formatNumber(trade.quantity, trade.quantity % 1 === 0 ? 0 : 4)} shares</span>
                      </div>
                    </div>
                  ))}
                  {!trades.length && (
                    <div className="activity-empty">
                      <div className="activity-empty-icon"><FileText size={19} /></div>
                      <strong>No activity yet</strong>
                      <span>Recorded buys and sells will appear here.</span>
                    </div>
                  )}
                </div>
                <div className="activity-foot">
                  <span>{auth?.mode === "demo" ? "Saved in this browser only" : auth?.mode === "supabase" ? "Saved to your private account" : "Portfolio storage unavailable"}</span>
                  <span>{trades.length} total fills</span>
                </div>
              </article>
            </div>
          </section>

          <section aria-labelledby="methodology-heading" className="panel methodology-panel" id="methodology">
            <div className="panel-header">
              <div>
                <div className="panel-title" id="methodology-heading">How this workspace works</div>
                <div className="panel-subtitle">A transparent, intentionally limited learning environment</div>
              </div>
              <div className="methodology-icon"><FileText size={17} /></div>
            </div>
            <div className="methodology-grid">
              <div>
                <span className="method-number">01</span>
                <strong>Market data</strong>
                <p>Daily historical observations are fetched from the configured source, or generated synthetically in demo mode. Source and date are shown above.</p>
              </div>
              <div>
                <span className="method-number">02</span>
                <strong>Explainable indicators</strong>
                <p>SMA20 and SMA50 average recent closing prices. RSI14 summarizes recent gains versus losses. These describe history, not the future.</p>
              </div>
              <div>
                <span className="method-number">03</span>
                <strong>AI with boundaries</strong>
                <p>The optional AI receives only the selected symbol and displayed market metrics. It receives no account credentials or portfolio records.</p>
              </div>
              <div>
                <span className="method-number">04</span>
                <strong>Paper-only trading</strong>
                <p>Trades use a $100,000 virtual starting balance. No broker is connected, no order is sent, and losses remain hypothetical.</p>
              </div>
            </div>
            <div className="risk-note">
              <ShieldAlert size={16} />
              <span><strong>Important:</strong> Market prices may be delayed, stale, missing, or simulated. AI text may be incomplete or inaccurate. This application does not provide investment advice and must not be used to make real financial decisions.</span>
              <a href="https://www.investor.gov/introduction-investing" rel="noreferrer" target="_blank">Investor education <ExternalLink size={12} /></a>
            </div>
          </section>

          <footer className="page-footer">
            <span>SignalDesk · AI trading education capstone</span>
            <span><span className="footer-dot" /> No brokerage connection</span>
            <a href="#methodology">Methodology &amp; safety <ArrowRight size={12} /></a>
          </footer>
        </div>
      </main>

      {mobileNavOpen && (
        <button
          aria-label="Close navigation menu"
          className="mobile-nav-scrim"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {authOpen && (
        <AuthDialog
          onAuthenticated={handleAuthenticated}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}

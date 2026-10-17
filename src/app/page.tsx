import { Suspense } from "react";
import TradingDashboard from "./trading-dashboard";

export default function Home() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading SignalDesk…</div>}>
      <TradingDashboard />
    </Suspense>
  );
}

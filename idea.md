# AlphaScan — Polymarket Alpha Discovery & Quant Dashboard

A data-intensive web application that scans Polymarket (prediction market platform)
for profitable trading opportunities using quantitative analysis, pattern detection,
and backtesting. Think "Bloomberg Terminal meets prediction markets" — lightweight,
data-rich, and strategy-focused.

## Market Context

Polymarket is the largest prediction market platform ($500M+ monthly volume).
Markets cover politics, crypto, sports, science, and world events. Unlike
traditional financial markets, prediction markets have:
- Binary outcomes (YES/NO shares trading $0-$1)
- Time-based resolution (markets expire)
- Information asymmetry (news drives price moves)
- Cross-market correlations (related events move together)

These create exploitable edges: arbitrage between related markets, momentum
strategies, mean reversion, resolution-date yield strategies, and news-reactive
trading. No existing retail tool provides systematic alpha discovery for Polymarket.

## User Personas

1. **Quant Trader Alex** — builds statistical models, backtests strategies,
   wants API access to raw data. Needs SQL interface and Python/R export.
2. **Deal Scout Sarah** — scans for obvious mispricing and arbitrage. Wants
   a dashboard with highlighted opportunities and alert thresholds.
3. **Portfolio Manager Jordan** — tracks active positions, measures P&L,
   wants risk metrics (VaR, Sharpe, max drawdown).

## Product Goals (verified by deterministic checks)

### G1: Data Pipeline
Fetch Polymarket markets via public API (gamma-api.polymarket.com), store in
SQLite. Daily refresh. Track: market ID, question, outcomes, prices, volume,
liquidity, resolution status, timestamps.
- Check: `sqlite3 data/polymarket.db "SELECT COUNT(*) FROM markets" | grep -v '^0$'`
- Check: `sqlite3 data/polymarket.db "SELECT COUNT(*) FROM prices" | grep -v '^0$'`
- Check: `node scripts/fetch-markets.mjs 2>&1 | grep -q 'markets fetched'`

### G2: Market Dashboard
Next.js dashboard showing: live markets table (sortable by volume, liquidity,
price), price sparklines (last 24h/7d), market detail pages with orderbook
depth, category filters (politics/crypto/sports/etc), search.
- Check: `curl -s localhost:3000 | grep -q AlphaScan`
- Check: `curl -s localhost:3000/api/markets | jq -e '. | length > 0'`
- Check: `npx playwright test tests/dashboard.spec.ts`

### G3: Pattern Detection Engine
Statistical pattern scanner: arbitrage detection (price inversion across related
markets), momentum signals (price velocity, volume spikes), mean reversion
(deviation from 14-day moving average), resolution yield (implied return to
resolution date). Results stored in `signals` table.
- Check: `sqlite3 data/polymarket.db "SELECT COUNT(*) FROM signals" | grep -v '^0$'`
- Check: `curl -s localhost:3000/api/signals | jq -e '. | length > 0'`
- Check: `node scripts/run-scanner.mjs 2>&1 | grep -q 'signals found'`

### G4: Backtesting Engine
Define strategies as parameterized rules (e.g., "buy when price < 0.10 AND
volume > 100k AND time_to_resolution > 7d, sell at resolution OR stop-loss at
0.05"). Run against historical data. Output: P&L curve, Sharpe ratio, win rate,
max drawdown, profit factor per strategy.
- Check: `node scripts/backtest.mjs --strategy momentum --days 90 2>&1 | grep -q 'Sharpe'`
- Check: `curl -s localhost:3000/api/backtest/results | jq -e '. | length > 0'`
- Check: `sqlite3 data/polymarket.db "SELECT COUNT(*) FROM backtest_results" | grep -v '^0$'`

### G5: Strategy Research & Discovery
Analyze market data for exploitable patterns. For EACH discovered strategy,
create a new goal in goals.jsonl. Categories to investigate:
- **Momentum**: price velocity, volume spikes, trend following
- **Mean reversion**: deviation from moving averages, RSI extremes
- **Arbitrage**: price inversions across related markets, calendar spreads
- **Resolution yield**: implied return to resolution date, time decay curves
- **News reaction**: price moves after major news events
- **Correlation**: pairs trading, basket hedging, sector rotation

Each strategy becomes its own goal with backtest checks.
- Check: `curl -s localhost:3000/api/alpha/strategies | jq -e '. | length > 0'`
- Check: `node scripts/discover-alpha.mjs 2>&1 | grep -q 'strategies found'`
- Check: `test -f data/alpha/strategy-recommendations.json`

### G6+: Adaptive Strategy Goals (dynamically created)
After foundation goals (G1-G5) are complete, the system enters **adaptive mode**.
Each discovered strategy becomes a new goal appended to goals.jsonl:

```json
{"id":"strategy-momentum-crypto","desc":"Momentum strategy for crypto markets: buy when 7d price change > 15% AND volume > 50k, sell at resolution. Backtest 90 days.","status":"pending","checks":[{"id":"backtest","cmd":"node scripts/backtest.mjs --strategy momentum-crypto --days 90 | grep -q 'Sharpe > 1.0'"},{"id":"profitable","cmd":"sqlite3 data/polymarket.db \"SELECT profit_factor FROM backtest_results WHERE strategy='momentum-crypto'\" | grep -v '^0\\."}]}
```

The system continuously loops: research → discover strategies → create goals → implement → backtest → keep if profitable → research more. Goals evolve as data reveals new edges. The playbook only stops when no new strategies are discovered AND all existing strategy goals pass.

### G6: Portfolio & Risk Analytics
Track hypothetical portfolio performance: position sizing (Kelly criterion),
risk metrics (VaR, Sharpe, max drawdown, Calmar ratio), performance attribution
(which strategies drive returns), correlation matrix of active positions.
- Check: `curl -s localhost:3000/api/portfolio/metrics | jq -e '.sharpe'`
- Check: `node scripts/calc-risk.mjs 2>&1 | grep -q 'VaR'`
- Check: `npx playwright test tests/portfolio.spec.ts`

## Technical Constraints
- Next.js 15 App Router, TypeScript strict, ESM
- Tailwind CSS 4, Chart.js 4, better-sqlite3
- Polymarket API: gamma-api.polymarket.com (public, no auth needed for reads)
- Data refresh: scheduled via cron or manual trigger
- All analysis deterministic and reproducible
- SQLite database in `data/polymarket.db`
- Single command: `npm run dev` starts the app

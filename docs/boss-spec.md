# Boss Calculation & Trading Terminal Spec

## Columns (in this exact order)
1. Event — matchup label, e.g., "Celtics @ Lakers (2025-10-12 7:00p)"
2. League — NBA / NFL / MLB / etc.
3. Prop — the actual bet (side + number), e.g.:
   - Under 147.5
   - Over 45.5
   - Celtics Moneyline (use team names; never "Home ML"/"Away ML")
   - Jayson Tatum Over 5.5 Rebounds
4. Market — category/bucket, e.g., Total Points, 1Q Total Points, Moneyline, Player Rebounds
5. My Odds — user-selected book's price (one source), e.g., -110
6. Win Probability — field consensus fair win probability (excludes My Odds)
7. +EV% — expected value percentage using Win Probability vs My Odds
8. Field Odds — all other books' prices for this exact prop (logo + price chips)

## Backend flow
1) Collect prices for the same {event, market, prop}.
2) Identify My Odds = one sportsbook chosen by user; only display that price in "My Odds".
3) Convert odds -> implied p_raw
   - American +A: p_raw = 100 / (A + 100)
   - American -A: p_raw = |A| / (|A| + 100)
   - Decimal d: p_raw = 1 / d
4) Remove vig (binary only: Over/Under, TeamA/TeamB, Yes/No)
   - sum = p_raw_side1 + p_raw_side2
   - p_fair_side1 = p_raw_side1 / sum
   - p_fair_side2 = p_raw_side2 / sum
5) Field consensus (exclude My Odds):
   - For the **exact prop side** (e.g., "Under 147.5"), take the **median** of the fair probabilities across remaining books.
   - This is **Win Probability**.
6) +EV%:
   - Convert My Odds to decimal payout:
     - +A: decimal = 1 + A/100
     - -A: decimal = 1 + 100/|A|
   - risk = 1 unit; payout = decimal - 1
   - **+EV% = (WinProb * payout) - ((1 - WinProb) * risk)**
7) Display:
   - My Odds: user's book price
   - Field Odds: all other books with logos + prices
   - Win Probability: % from step 5
   - +EV%: step 6

## Scope
- Implement for **binary** markets (moneyline 2-way, spreads, totals, Y/N). Skip 3-way for now.
- Clamp probs to [1e-6, 1 - 1e-6] for numerical safety.
- Use median; ignore missing/invalid books.
- Live rows: respect XML "live" status; only filter out stale (> 60s old) live odds.
- Formatting: +EV% to one decimal place; Win Probability to one decimal place; odds as +### / -###

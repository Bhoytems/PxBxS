const cryptoAssets = {
  BTCUSDT: "Bitcoin (BTC/USDT)",
  ETHUSDT: "Ethereum (ETH/USDT)",
  SOLUSDT: "Solana (SOL/USDT)",
  DOGEUSDT: "Dogecoin (DOGE/USDT)",
  ADAUSDT: "Cardano (ADA/USDT)"
};

const forexAssets = {
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
  "AUD/USD": "AUD/USD",
  "USD/CAD": "USD/CAD"
};

let chart;
let autoRefreshInterval = null;

function updateAssetOptions() {
  const market = document.getElementById("market").value;
  const assetSel = document.getElementById("asset");
  assetSel.innerHTML = "";
  const assets = market === "crypto" ? cryptoAssets : forexAssets;

  for (const [k, v] of Object.entries(assets)) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = v;
    assetSel.appendChild(opt);
  }
}
updateAssetOptions();

function SMA(arr, period) {
  return arr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function EMA(prices, period) {
  const k = 2 / (period + 1);
  let emaArr = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emaArr.push(prices[i] * k + emaArr[i - 1] * (1 - k));
  }
  return emaArr;
}

function RSI(prices, period = 14) {
  let gains = [], losses = [];
  for (let i = 1; i < prices.length; i++) {
    let diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }
  const avgGain = SMA(gains, period);
  const avgLoss = SMA(losses, period);
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function generateSignal() {
  const market = document.getElementById("market").value;
  const asset = document.getElementById("asset").value;
  const tf = document.getElementById("timeframe").value;
  const out = document.getElementById("output");

  out.innerHTML = "<p>⏳ Fetching live data...</p>";

  try {
    let prices = [], labels = [];

    if (market === "crypto") {
      const url = `https://api.binance.com/api/v3/klines?symbol=${asset}&interval=${tf}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();

      prices = data.map(p => parseFloat(p[4]));
      labels = data.map(p => new Date(p[0]).toLocaleTimeString());

    } else {
      const tfMap = {
        "5s": "5s",
        "30s": "30s",
        "1m": "1min",
        "3m": "3min",
        "5m": "5min"
      };

      const url = `https://api.twelvedata.com/time_series?symbol=${asset}&interval=${tfMap[tf]}&outputsize=100&apikey=2fb822c09c1c42e19c07e94090f18b42`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.values) throw new Error(data.message || "Invalid response");

      prices = data.values.reverse().map(p => parseFloat(p.close));
      labels = data.values.reverse().map(p => p.datetime.split(" ")[1]);
    }

    const current = prices.at(-1);
    const ema9 = EMA(prices, 9).at(-1);
    const ema21 = EMA(prices, 21).at(-1);
    const rsi = RSI(prices, 14);

    let signal = "HOLD", strength = "Weak";

    if (ema9 > ema21 && rsi > 55) {
      signal = "BUY";
      strength = rsi > 65 ? "Strong" : "Moderate";
    } else if (ema9 < ema21 && rsi < 45) {
      signal = "SELL";
      strength = rsi < 35 ? "Strong" : "Moderate";
    }

    const colorClass = signal === "BUY" ? "buy" : signal === "SELL" ? "sell" : "hold";

    const validity =
      tf === "5s" ? "≈10–20s" :
      tf === "30s" ? "≈1–2 min" :
      tf === "1m" ? "≈2–5 min" :
      tf === "3m" ? "≈10 min" : "≈15–30 min";

    out.innerHTML = `
      <p><b>Market:</b> ${market.toUpperCase()} | <b>Asset:</b> ${(market === "crypto" ? cryptoAssets[asset] : forexAssets[asset])}</p>
      <p><b>Timeframe:</b> ${tf} | <b>Current Price:</b> $${current.toFixed(4)}</p>
      <p>EMA(9): $${ema9.toFixed(4)} | EMA(21): $${ema21.toFixed(4)} | RSI(14): ${rsi.toFixed(2)}</p>
      <div class="signal ${colorClass}">Signal: ${signal}</div>
      <div class="strength">📈 Strength: ${strength}</div>
      <p>🕒 Valid for ${validity}</p>
    `;

    const ctx = document.getElementById("priceChart");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          { label: "Price", data: prices, borderColor: "#58a6ff", tension: .3, fill: false },
          { label: "EMA(9)", data: EMA(prices, 9), borderColor: "#2ea043", tension: .3, fill: false },
          { label: "EMA(21)", data: EMA(prices, 21), borderColor: "#f85149", tension: .3, fill: false }
        ]
      },
      options: {
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
          x: { ticks: { color: '#ccc' } },
          y: { ticks: { color: '#ccc' } }
        }
      }
    });

  } catch (e) {
    out.innerHTML = `<p style="color:red;">❌ Error: ${e.message}</p>`;
  }
}

function toggleAutoRefresh() {
  const isChecked = document.getElementById("autoRefresh").checked;

  if (isChecked) {
    generateSignal();
    autoRefreshInterval = setInterval(generateSignal, 60000);
  } else {
    clearInterval(autoRefreshInterval);
  }
}

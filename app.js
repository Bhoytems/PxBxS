const API_KEY = "LX98E4376J8RG23B";  // put your real API key here
const symbols = ["AAPL", "AXP"];

async function fetchStock(symbol) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data["Time Series (1min)"] || {};
  } catch (err) {
    console.error("Error fetching data:", err);
    return {};
  }
}

function linearRegression(prices) {
  const n = prices.length;
  const x = [...Array(n).keys()];
  const y = prices;

  const xMean = x.reduce((a, b) => a + b) / n;
  const yMean = y.reduce((a, b) => a + b) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = num / den;
  const intercept = yMean - slope * xMean;

  const nextX = n + 5; // 5 min ahead
  const futureValue = slope * nextX + intercept;

  return { slope, futureValue };
}

async function updateStock(symbol) {
  const data = await fetchStock(symbol);
  const times = Object.keys(data).sort().reverse();
  const latest = data[times[0]];
  const current = latest ? parseFloat(latest["1. open"]) : null;

  const recent = times.slice(0, 10).map(t => parseFloat(data[t]["1. open"]));
  let proj = null, slope = 0;
  if (recent.length >= 2) {
    const res = linearRegression(recent);
    proj = res.futureValue;
    slope = res.slope;
  }

  document.getElementById(symbol + "-current").innerText = current ? current.toFixed(2) : "—";
  document.getElementById(symbol + "-proj").innerText = proj ? proj.toFixed(2) : "—";

  const buyBtn = document.getElementById(symbol + "-buy");
  const sellBtn = document.getElementById(symbol + "-sell");

  buyBtn.classList.remove("active", "buy");
  sellBtn.classList.remove("active", "sell");

  if (slope > 0) {
    buyBtn.classList.add("active", "buy");
  } else if (slope < 0) {
    sellBtn.classList.add("active", "sell");
  }
}

function refresh() {
  symbols.forEach(updateStock);
}

refresh();
setInterval(refresh, 60000); // update every 1 min

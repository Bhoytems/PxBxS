// ⚡ Replace with your API keys
const API_KEYS = {
  twelvedata: "2fb822c09c1c42e19c07e94090f18b42",
  finnhub: "YOUR_FINNHUB_API_KEY"
};

let prices = [];
let chart;
let polling;

const buyBtn = document.getElementById("buyBtn");
const sellBtn = document.getElementById("sellBtn");
const lastPriceEl = document.getElementById("lastPrice");
const pairLabel = document.getElementById("pairLabel");

function initChart() {
  const ctx = document.getElementById("priceChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Price",
          data: [],
          borderColor: "#00ffcc",
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } },
      },
    },
  });
}

async function fetchPrice(pair, provider) {
  try {
    if (provider === "twelvedata") {
      let url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(pair)}&apikey=${API_KEYS.twelvedata}`;
      let res = await fetch(url);
      let data = await res.json();
      return parseFloat(data.price);
    } else if (provider === "finnhub") {
      let symbol = pair === "XAU/USD" ? "OANDA:XAU_USD" : pair.replace("/", "");
      let url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEYS.finnhub}`;
      let res = await fetch(url);
      let data = await res.json();
      return parseFloat(data.c);
    }
  } catch (err) {
    console.error("API error", err);
    return null;
  }
}

function predict(prices, horizon, velWindow) {
  if (prices.length < velWindow + 1) return null;
  let recent = prices.slice(-velWindow);
  let slope = (recent[recent.length - 1] - recent[0]) / velWindow;
  let predicted = prices[prices.length - 1] + slope * horizon;
  return predicted;
}

function suggest(last, predicted) {
  if (!predicted) return;
  if (predicted > last) {
    buyBtn.classList.add("active");
    sellBtn.classList.remove("active");
  } else {
    sellBtn.classList.add("active");
    buyBtn.classList.remove("active");
  }
}

document.getElementById("connect").addEventListener("click", () => {
  if (polling) clearInterval(polling);
  initChart();

  const pair = document.getElementById("pairSelect").value;
  const provider = document.getElementById("providerSelect").value;
  const interval = parseInt(document.getElementById("interval").value);
  const horizon = parseInt(document.getElementById("horizon").value);
  const velWindow = parseInt(document.getElementById("velWindow").value);

  pairLabel.textContent = pair;
  prices = [];

  polling = setInterval(async () => {
    const price = await fetchPrice(pair, provider);
    if (!price) return;

    lastPriceEl.textContent = price.toFixed(5);
    prices.push(price);
    if (prices.length > 100) prices.shift();

    chart.data.labels = prices.map((_, i) => i);
    chart.data.datasets[0].data = prices;
    chart.update();

    const predicted = predict(prices, horizon, velWindow);
    suggest(price, predicted);
  }, interval);
});

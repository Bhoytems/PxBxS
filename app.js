const API_KEY = "EYNWMFZAC24U7IDC"; // Replace with your real API key
const symbols = ["AAPL", "AXP"];

let lastPrices = {};

async function getPrice(symbol) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data["Time Series (1min)"]) {
    throw new Error("API limit or invalid response");
  }

  const series = data["Time Series (1min)"];
  const lastTime = Object.keys(series)[0];
  const lastClose = parseFloat(series[lastTime]["4. close"]);

  return lastClose;
}

async function updatePrices() {
  for (let symbol of symbols) {
    try {
      const currentPrice = await getPrice(symbol);
      const prevPrice = lastPrices[symbol] || currentPrice;

      // Calculate "5s ahead price" as a small trend projection
      const projected = (currentPrice + (currentPrice - prevPrice)).toFixed(2);

      // Update DOM
      document.getElementById(symbol.toLowerCase() + "-price").innerText = currentPrice.toFixed(2);
      document.getElementById(symbol.toLowerCase() + "-future").innerText = projected;

      // Reset buttons to neutral
      resetButtons(symbol);

      // Suggest after 10 seconds
      setTimeout(() => {
        suggestAction(symbol, currentPrice, projected);
      }, 10000);

      lastPrices[symbol] = currentPrice;
    } catch (err) {
      console.error("Error fetching price:", err);
    }
  }
}

function resetButtons(symbol) {
  document.getElementById(symbol.toLowerCase() + "-buy").className = "signal-btn";
  document.getElementById(symbol.toLowerCase() + "-sell").className = "signal-btn";
  document.getElementById(symbol.toLowerCase() + "-suggestion").innerText = "Waiting...";
}

function suggestAction(symbol, current, future) {
  const buyBtn = document.getElementById(symbol.toLowerCase() + "-buy");
  const sellBtn = document.getElementById(symbol.toLowerCase() + "-sell");
  const suggestion = document.getElementById(symbol.toLowerCase() + "-suggestion");

  if (future > current) {
    buyBtn.classList.add("active-buy");
    suggestion.innerText = "Suggested: BUY";
  } else if (future < current) {
    sellBtn.classList.add("active-sell");
    suggestion.innerText = "Suggested: SELL";
  } else {
    suggestion.innerText = "No clear signal";
  }
}

// Initial + repeat every 1 min
updatePrices();
setInterval(updatePrices, 60000);

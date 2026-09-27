let currentSearchResult = null;
let useFahrenheit = false;
let debounceTimer = null;

// Gestão do LocalStorage
function getFavorites() {
  const saved = localStorage.getItem("weather_favorites");
  return saved ? JSON.parse(saved) : [];
}

function saveFavorites(cities) {
  localStorage.setItem("weather_favorites", JSON.stringify(cities));
}

// Conversão de Temperatura
function formatTemp(tempC) {
  if (useFahrenheit) {
    return `${Math.round((tempC * 9) / 5 + 32)} °F`;
  }
  return `${Math.round(tempC)} °C`;
}

function toggleUnit() {
  useFahrenheit = !useFahrenheit;
  document.getElementById("unitToggleBtn").textContent = useFahrenheit ? "°F" : "°C";
  if (currentSearchResult) renderSearchCard(currentSearchResult);
  loadFavoritesGrid();
}

// Mapeamento WeatherCode
function getWeatherDetails(code) {
  switch (code) {
    case 0: return { icon: "☀️", desc: "Céu limpo", theme: "theme-clear" };
    case 1:
    case 2: return { icon: "🌤️", desc: "Parcialmente nublado", theme: "theme-clear" };
    case 3: return { icon: "☁️", desc: "Nublado", theme: "theme-clouds" };
    case 45:
    case 48: return { icon: "🌫️", desc: "Nevoeiro", theme: "theme-clouds" };
    case 51: case 53: case 55:
    case 61: case 63: case 65:
    case 80: case 81: case 82: return { icon: "🌧️", desc: "Chuva", theme: "theme-rain" };
    case 71: case 73: case 75: return { icon: "❄️", desc: "Neve", theme: "theme-clouds" };
    case 95: case 96: case 99: return { icon: "⛈️", desc: "Tempestade", theme: "theme-rain" };
    default: return { icon: "🌡️", desc: "Clima variado", theme: "" };
  }
}

// Aplicar Tema de Fundo Dinâmico
function updateTheme(weatherCode) {
  const currentHour = new Date().getHours();
  const isNight = currentHour < 6 || currentHour > 18;

  document.body.className = "";
  if (isNight) {
    document.body.classList.add("theme-night");
  } else {
    const details = getWeatherDetails(weatherCode);
    if (details.theme) document.body.classList.add(details.theme);
  }
}

// AUTO-COMPLETE COM DEBOUNCE
function handleAutocomplete() {
  const query = document.getElementById("cityInput").value.trim();
  const suggestionsList = document.getElementById("suggestionsList");

  clearTimeout(debounceTimer);
  if (query.length < 2) {
    suggestionsList.classList.add("hidden");
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`;
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        suggestionsList.classList.add("hidden");
        return;
      }

      suggestionsList.innerHTML = "";
      data.results.forEach((city) => {
        const li = document.createElement("li");
        const displayName = city.country ? `${city.name}, ${city.country}` : city.name;
        li.textContent = displayName;
        li.onclick = () => {
          document.getElementById("cityInput").value = displayName;
          suggestionsList.classList.add("hidden");
          currentSearchResult = { name: displayName, latitude: city.latitude, longitude: city.longitude };
          renderSearchCard(currentSearchResult);
        };
        suggestionsList.appendChild(li);
      });

      suggestionsList.classList.remove("hidden");
    } catch (e) {
      console.error(e);
    }
  }, 300);
}

// BUSCAR CIDADE PELO BOTÃO
async function searchCity() {
  const input = document.getElementById("cityInput");
  const cityQuery = input.value.trim();
  const errorElement = document.getElementById("error");

  errorElement.textContent = "";
  document.getElementById("suggestionsList").classList.add("hidden");
  if (!cityQuery) return;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=pt&format=json`;
    const response = await fetch(geoUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      errorElement.textContent = "Cidade não encontrada.";
      return;
    }

    const { latitude, longitude, name, country } = data.results[0];
    const displayName = country ? `${name}, ${country}` : name;

    currentSearchResult = { name: displayName, latitude, longitude };
    await renderSearchCard(currentSearchResult);
  } catch (err) {
    errorElement.textContent = "Erro ao buscar cidade.";
  }
}

// BUSCA POR GEOLOCALIZAÇÃO
function getWeatherByLocation() {
  const errorElement = document.getElementById("error");
  errorElement.textContent = "";

  if (!navigator.geolocation) {
    errorElement.textContent = "Geolocalização não suportada.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      currentSearchResult = { name: "Minha Localização", latitude, longitude };
      await renderSearchCard(currentSearchResult);
    },
    () => { errorElement.textContent = "Permissão de localização negada."; }
  );
}

// RENDERIZAR CARD PRINCIPAL
async function renderSearchCard(city) {
  const resultsSection = document.getElementById("searchResults");
  
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunset&forecast_days=7&timezone=auto`;
    const response = await fetch(weatherUrl);
    const data = await response.json();

    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const currentDetails = getWeatherDetails(current.weather_code);

    updateTheme(current.weather_code);

    document.getElementById("cityName").textContent = city.name;
    document.getElementById("weatherIcon").textContent = currentDetails.icon;
    document.getElementById("temperature").textContent = formatTemp(current.temperature_2m);
    document.getElementById("weatherDesc").textContent = currentDetails.desc;

    document.getElementById("feelsLike").textContent = formatTemp(current.apparent_temperature);
    document.getElementById("uvIndex").textContent = Math.round(daily.uv_index_max[0]);
    document.getElementById("precipitation").textContent = `${current.precipitation} mm`;
    document.getElementById("wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById("humidity").textContent = `${current.relative_humidity_2m} %`;
    document.getElementById("sunset").textContent = new Date(daily.sunset[0]).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Previsão Horária
    const hourlyContainer = document.getElementById("hourlyForecast");
    hourlyContainer.innerHTML = "";
    const currentHour = new Date().getHours();
    for (let i = currentHour; i < currentHour + 24; i++) {
      if (!hourly.time[i]) break;
      const hourTime = new Date(hourly.time[i]).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const hourDetails = getWeatherDetails(hourly.weather_code[i]);
      hourlyContainer.innerHTML += `
        <div class="hourly-card">
          <div class="time">${hourTime}</div>
          <div class="icon">${hourDetails.icon}</div>
          <div class="temp">${formatTemp(hourly.temperature_2m[i])}</div>
        </div>
      `;
    }

    // Previsão 7 Dias
    const forecastContainer = document.getElementById("forecast");
    forecastContainer.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const date = new Date(daily.time[i] + "T00:00:00");
      let dayName = i === 0 ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const dayDetails = getWeatherDetails(daily.weather_code[i]);
      forecastContainer.innerHTML += `
        <div class="forecast-row">
          <div class="day">${dayName.toUpperCase()}</div>
          <div class="icon">${dayDetails.icon}</div>
          <div class="temps"><strong>${formatTemp(daily.temperature_2m_max[i])}</strong> / ${formatTemp(daily.temperature_2m_min[i])}</div>
        </div>
      `;
    }

    resultsSection.classList.remove("hidden");
  } catch (err) {
    console.error("Erro ao carregar clima:", err);
  }
}

// ADICIONAR FAVORITO
function addCurrentToFavorites() {
  if (!currentSearchResult) return;

  const favorites = getFavorites();
  if (favorites.some(c => c.name === currentSearchResult.name)) {
    alert("Esta cidade já está na sua lista!");
    return;
  }

  favorites.push(currentSearchResult);
  saveFavorites(favorites);
  loadFavoritesGrid();
}

// REMOVER FAVORITO
function removeFavorite(index) {
  const favorites = getFavorites();
  favorites.splice(index, 1);
  saveFavorites(favorites);
  loadFavoritesGrid();
}

// CARREGAR GRID FAVORITOS
async function loadFavoritesGrid() {
  const grid = document.getElementById("favoritesGrid");
  grid.innerHTML = "";
  const favorites = getFavorites();

  if (favorites.length === 0) {
    grid.innerHTML = `<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">Nenhuma cidade salva. Pesquise acima e adicione aos favoritos.</p>`;
    return;
  }

  for (let index = 0; index < favorites.length; index++) {
    const city = favorites[index];
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const response = await fetch(weatherUrl);
      const data = await response.json();

      const current = data.current;
      const daily = data.daily;
      const details = getWeatherDetails(current.weather_code);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <button class="btn-remove" onclick="removeFavorite(${index})" title="Remover">✕</button>
        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 6px;">${city.name}</h3>
        <div class="weather-icon">${details.icon}</div>
        <div class="temp" style="font-size: 2rem;">${formatTemp(current.temperature_2m)}</div>
        <p class="weather-desc" style="margin-bottom: 10px;">${details.desc}</p>
        <div class="forecast-row" style="background: rgba(255,255,255,0.4);">
          <span style="font-size: 0.8rem; font-weight: 600;">Hoje</span>
          <span style="font-size: 0.8rem;"><strong>${formatTemp(daily.temperature_2m_max[0])}</strong> / ${formatTemp(daily.temperature_2m_min[0])}</span>
        </div>
      `;
      grid.appendChild(card);
    } catch (e) {
      console.error(e);
    }
  }
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("cityInput");
  
  cityInput.addEventListener("input", handleAutocomplete);
  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchCity();
  });

  // Esconder sugestões ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      document.getElementById("suggestionsList").classList.add("hidden");
    }
  });

  loadFavoritesGrid();
});
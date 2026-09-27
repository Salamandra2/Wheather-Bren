import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MapPin, Plus, Trash2, Sun, Cloud, 
  CloudRain, Wind, Droplets, Sunset, Eye, AlertTriangle 
} from 'lucide-react';

export default function WeatherBrenApp() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesData, setFavoritesData] = useState([]);
  const [unit, setUnit] = useState('C'); // 'C' ou 'F'
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  // Carregar favoritos ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('weather_bren_favs');
    if (saved) {
      const parsed = JSON.parse(saved);
      setFavorites(parsed);
      loadFavoritesData(parsed);
    }
  }, []);

  // Conversão de unidades
  const formatTemp = (tempC) => {
    if (tempC === undefined || tempC === null) return '--°';
    if (unit === 'F') {
      return `${Math.round((tempC * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(tempC)}°C`;
  };

  // Mapeamento WeatherCode
  const getWeatherDetails = (code) => {
    switch (code) {
      case 0: return { icon: <Sun className="w-8 h-8 text-amber-400" />, desc: "Céu limpo", theme: "from-amber-500/20 via-sky-500/10 to-transparent" };
      case 1:
      case 2: return { icon: <Cloud className="w-8 h-8 text-sky-300" />, desc: "Parcialmente nublado", theme: "from-blue-500/20 via-sky-400/10 to-transparent" };
      case 3: return { icon: <Cloud className="w-8 h-8 text-slate-400" />, desc: "Nublado", theme: "from-slate-500/20 via-slate-400/10 to-transparent" };
      case 51: case 53: case 55:
      case 61: case 63: case 65:
      case 80: case 81: case 82: return { icon: <CloudRain className="w-8 h-8 text-blue-400" />, desc: "Chuva", theme: "from-indigo-600/20 via-blue-500/10 to-transparent" };
      default: return { icon: <Sun className="w-8 h-8 text-amber-400" />, desc: "Clima Variado", theme: "from-sky-500/20 to-transparent" };
    }
  };

  // Auto-complete
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=pt&format=json`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (err) {
        setSuggestions([]);
      }
    }, 300);
  };

  // Selecionar Cidade
  const selectCity = async (city) => {
    const displayName = city.country ? `${city.name}, ${city.country}` : city.name;
    setQuery(displayName);
    setSuggestions([]);
    setError('');

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunset&forecast_days=7&timezone=auto`;
      const res = await fetch(weatherUrl);
      const data = await res.json();

      setCurrentResult({
        name: displayName,
        latitude: city.latitude,
        longitude: city.longitude,
        data
      });
    } catch (err) {
      setError('Erro ao carregar dados do clima.');
    }
  };

  // Favoritos
  const addFavorite = () => {
    if (!currentResult) return;
    if (favorites.some(f => f.name === currentResult.name)) return;

    const newFavs = [...favorites, { name: currentResult.name, latitude: currentResult.latitude, longitude: currentResult.longitude }];
    setFavorites(newFavs);
    localStorage.setItem('weather_bren_favs', JSON.stringify(newFavs));
    loadFavoritesData(newFavs);
  };

  const removeFavorite = (name) => {
    const newFavs = favorites.filter(f => f.name !== name);
    setFavorites(newFavs);
    localStorage.setItem('weather_bren_favs', JSON.stringify(newFavs));
    setFavoritesData(favoritesData.filter(f => f.name !== name));
  };

  const loadFavoritesData = async (favList) => {
    const results = await Promise.all(favList.map(async (city) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await res.json();
        return { ...city, data };
      } catch (err) {
        return null;
      }
    }));
    setFavoritesData(results.filter(Boolean));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans selection:bg-sky-500/30">
      
      {/* Background Atmosphere Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Weather Bren <span className="text-sky-400 text-sm font-semibold tracking-wider uppercase ml-2 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">Sequoia OS</span>
          </h1>

          {/* Unit Toggle Switch */}
          <div className="flex items-center gap-1 p-1 bg-white/10 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-inner">
            <button 
              onClick={() => setUnit('C')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${unit === 'C' ? 'bg-white/30 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              °C
            </button>
            <button 
              onClick={() => setUnit('F')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${unit === 'F' ? 'bg-white/30 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              °F
            </button>
          </div>
        </header>

        {/* Search Bar Wrapper */}
        <div className="relative max-w-xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              value={query}
              onChange={handleInputChange}
              placeholder="Pesquisar cidade..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[20px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] transition-all duration-300"
            />
          </div>

          {/* Autocomplete Dropdown Menu */}
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-2 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[20px] overflow-hidden shadow-2xl z-50 divide-y divide-white/5">
              {suggestions.map((city) => (
                <li 
                  key={`${city.latitude}-${city.longitude}`}
                  onClick={() => selectCity(city)}
                  className="px-5 py-3 hover:bg-white/10 cursor-pointer text-sm text-slate-200 transition-colors duration-150 flex items-center justify-between"
                >
                  <span>{city.name}</span>
                  <span className="text-xs text-slate-400">{city.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* MAIN SEARCH RESULT (Apple Liquid Glass Spec Card) */}
        {currentResult && (
          <section className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative bg-white/10 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] rounded-[24px] p-6 md:p-8 hover:border-white/30 transition-all duration-300 ease-out group overflow-hidden">
              
              {/* Dynamic Weather Background Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getWeatherDetails(currentResult.data.current.weather_code).theme} pointer-events-none`} />

              {/* Card Top Actions */}
              <div className="flex justify-between items-center relative z-10 mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                  Resultado Atual
                </span>
                <button 
                  onClick={addFavorite}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium transition-all duration-200"
                >
                  <Plus className="w-4 h-4" /> Adicionar às Salvas
                </button>
              </div>

              {/* Main Weather Display */}
              <div className="relative z-10 text-center my-4">
                <h2 className="text-2xl font-bold text-white mb-1">{currentResult.name}</h2>
                <div className="flex justify-center my-3">
                  {getWeatherDetails(currentResult.data.current.weather_code).icon}
                </div>
                <div className="text-6xl font-extrabold text-white tracking-tight">
                  {formatTemp(currentResult.data.current.temperature_2m)}
                </div>
                <p className="text-slate-300 capitalize text-sm font-medium mt-2">
                  {getWeatherDetails(currentResult.data.current.weather_code).desc}
                </p>
              </div>

              {/* Glass Metrics Grid */}
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-3 my-6">
                <MetricTile label="Sensação" value={formatTemp(currentResult.data.current.apparent_temperature)} icon={<Sun className="w-4 h-4 text-amber-400" />} />
                <MetricTile label="Vento" value={`${Math.round(currentResult.data.current.wind_speed_10m)} km/h`} icon={<Wind className="w-4 h-4 text-sky-400" />} />
                <MetricTile label="Umidade" value={`${currentResult.data.current.relative_humidity_2m}%`} icon={<Droplets className="w-4 h-4 text-blue-400" />} />
                <MetricTile label="Índice UV" value={Math.round(currentResult.data.daily.uv_index_max[0])} icon={<Sun className="w-4 h-4 text-yellow-400" />} />
                <MetricTile label="Chuva" value={`${currentResult.data.current.precipitation} mm`} icon={<CloudRain className="w-4 h-4 text-indigo-400" />} />
                <MetricTile label="Pôr do Sol" value={new Date(currentResult.data.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} icon={<Sunset className="w-4 h-4 text-orange-400" />} />
              </div>

              {/* Hourly Forecast Timeline */}
              <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Previsão Horária</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {currentResult.data.hourly.time.slice(new Date().getHours(), new Date().getHours() + 12).map((time, idx) => {
                    const actualIdx = new Date().getHours() + idx;
                    return (
                      <div key={time} className="flex flex-col items-center min-w-[60px] p-2 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] text-slate-400">{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="my-1 scale-75">{getWeatherDetails(currentResult.data.hourly.weather_code[actualIdx]).icon}</div>
                        <span className="text-xs font-bold">{formatTemp(currentResult.data.hourly.temperature_2m[actualIdx])}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* SAVED CITIES SECTION */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            Minhas Cidades Salvas <span className="text-xs font-normal text-slate-400">({favoritesData.length})</span>
          </h2>

          {favoritesData.length === 0 ? (
            <div className="p-8 text-center bg-white/5 border border-white/10 rounded-[24px]">
              <p className="text-sm text-slate-400">Nenhuma cidade salva ainda. Pesquise uma cidade acima para adicionar aos seus favoritos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoritesData.map((fav) => (
                <div 
                  key={fav.name}
                  className="relative bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[24px] p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] hover:border-white/30 transition-all duration-300 group"
                >
                  <button 
                    onClick={() => removeFavorite(fav.name)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <h3 className="font-bold text-white text-base pr-8">{fav.name}</h3>
                  <div className="flex items-center justify-between my-3">
                    <div className="text-3xl font-extrabold text-white">
                      {formatTemp(fav.data.current.temperature_2m)}
                    </div>
                    {getWeatherDetails(fav.data.current.weather_code).icon}
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 bg-white/5 p-2 rounded-xl border border-white/5">
                    <span>Máx / Mín</span>
                    <span className="font-semibold text-slate-200">
                      {formatTemp(fav.data.daily.temperature_2m_max[0])} / {formatTemp(fav.data.daily.temperature_2m_min[0])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// Sub-componente de Métrica em Vidro
function MetricTile({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[16px]">
      <div className="p-2 bg-white/10 rounded-xl">{icon}</div>
      <div>
        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">{label}</div>
        <div className="text-sm font-bold text-white">{value}</div>
      </div>
    </div>
  );
}
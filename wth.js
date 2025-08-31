#!/usr/bin/env node

const https = require("https");

const colors = Object.freeze({
  reset: "\x1b[0m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
});

function colorTemp(temp) {
  temp = parseFloat(temp);
  if (temp > 30) return `${colors.red}${temp}°C${colors.reset}`;
  if (temp < 7) return `${colors.blue}${temp}°C${colors.reset}`;
  return `${colors.green}${temp}°C${colors.reset}`;
}

function colorWind(wind) {
  wind = parseFloat(wind);
  if (wind < 10) return `${colors.green}${wind} m/s${colors.reset}`;
  return `${wind} m/s`;
}

function colorRain(rain) {
  rain = parseFloat(rain);
  if (rain > 5) return `${colors.red}${rain} mm${colors.reset}`;
  if (rain > 1) return `${colors.blue}${rain} mm${colors.reset}`;
  if (rain === 0) return `${colors.green}${rain} mm${colors.reset}`;
  return `${rain} mm`;
}

function colorCondition(desc) {
  desc = desc.toLowerCase();
  if (desc.includes("clear")) return `${colors.green}${desc}${colors.reset}`;
  if (desc.includes("thunderstorm")) return `${colors.magenta}⚡ ${desc}${colors.reset}`;
  return desc;
}

function getApiKey() {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.error("❌ WEATHER_API_KEY environment variable is not set.");
    process.exit(1);
  }
  return apiKey;
}

function fetchJson(url, onSuccess, onError) {
  https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        onSuccess(json);
      } catch (err) {
        onError && onError(err);
      }
    });
  }).on("error", (err) => {
    onError && onError(err);
  });
}

function printCurrentWeather(weather) {
  console.log(`📍 Current Weather in ${weather.name}, ${weather.sys.country}`);
  console.log("------------------------------------------------------\n");
  const temp = weather.main.temp.toFixed(1);
  const wind = weather.wind.speed.toFixed(1);
  const rain = weather.rain && weather.rain["1h"] ? weather.rain["1h"] : 0;
  const desc = weather.weather[0].description;
  console.log(`🌡️ Temperature: ${colorTemp(temp)}`);
  console.log(`💨 Wind: ${colorWind(wind)}`);
  console.log(`🌧️ Rain: ${colorRain(rain)}`);
  console.log(`☁️ Condition: ${colorCondition(desc)}`);
}

function printForecast(forecast, days) {
  console.log(`📅 Forecast for ${forecast.city.name}, ${forecast.city.country}`);
  console.log("------------------------------------------------------\n");
  const daily = {};
  forecast.list.forEach((entry) => {
    const date = entry.dt_txt.split(" ")[0];
    if (!daily[date]) daily[date] = { temps: [], winds: [], rains: [], descriptions: [] };
    daily[date].temps.push(entry.main.temp);
    daily[date].winds.push(entry.wind.speed);
    daily[date].descriptions.push(entry.weather[0].description);
    daily[date].rains.push(entry.rain && entry.rain["3h"] ? entry.rain["3h"] : 0);
  });
  Object.keys(daily).slice(0, days).forEach((date) => {
    const d = daily[date];
    const minTemp = Math.min(...d.temps).toFixed(1);
    const maxTemp = Math.max(...d.temps).toFixed(1);
    const avgTemp = (d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1);
    const avgWind = (d.winds.reduce((a, b) => a + b, 0) / d.winds.length).toFixed(1);
    const totalRain = d.rains.reduce((a, b) => a + b, 0).toFixed(1);
    const desc = d.descriptions.sort((a, b) =>
      d.descriptions.filter((v) => v === a).length - d.descriptions.filter((v) => v === b).length
    ).pop();
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(date));
    console.log(`${colors.bold}${weekday}${colors.reset} — ${date}`);
    console.log(`🌡️ Min Temp: ${colorTemp(minTemp)} | Max Temp: ${colorTemp(maxTemp)} | Avg Temp: ${colorTemp(avgTemp)}`);
    console.log(`💨 Wind: ${colorWind(avgWind)} | 🌧️ Rain: ${colorRain(totalRain)} | ☁️ Condition: ${colorCondition(desc)}`);
    console.log("\n");
  });
}

function getCurrentWeather(city) {
  const apiKey = getApiKey();
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  fetchJson(
    url,
    (weather) => {
      if (weather.cod !== 200) {
        console.log("❌ Error:", weather.message);
        return;
      }
      printCurrentWeather(weather);
    },
    (err) => console.error("❌ Failed to fetch current weather data", err.message)
  );
}

function getForecast(city, days) {
  const apiKey = getApiKey();
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  fetchJson(
    url,
    (forecast) => {
      if (forecast.cod !== "200") {
        console.log("❌ Error:", forecast.message);
        return;
      }
      printForecast(forecast, days);
    },
    (err) => console.error("❌ Failed to fetch forecast data", err.message)
  );
}

function getCurrentCity(callback) {
  fetchJson(
    "https://ipwhois.app/json/",
    (geo) => {
      if (geo && geo.city) callback(geo.city);
      else callback("London");
    },
    () => callback("London")
  );
}

function main() {
  const city = process.argv[2];
  const days = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  if (city) {
    if (days) getForecast(city, days);
    else getCurrentWeather(city);
  } else {
    getCurrentCity((detectedCity) => {
      if (days) getForecast(detectedCity, days);
      else getCurrentWeather(detectedCity);
    });
  }
}

main();

import { SensorReading } from '../types';

// Constants for simulation
const BASE_TEMP = 24.0;
const BASE_HUMID = 55.0;
const BASE_PRESSURE = 1013.25;

let currentTemp = BASE_TEMP;
let currentHumid = BASE_HUMID;
let currentPressure = BASE_PRESSURE;

/**
 * Simulates a reading from DHT22 and BMP280.
 */
export const getSimulatedReading = (): SensorReading => {
  const tempDrift = (Math.random() - 0.5) * 0.3;
  const humidDrift = (Math.random() - 0.5) * 1.0;
  const pressureDrift = (Math.random() - 0.5) * 0.2;

  currentTemp += tempDrift;
  currentHumid += humidDrift;
  currentPressure += pressureDrift;

  if (currentHumid > 99) currentHumid = 99;
  if (currentHumid < 10) currentHumid = 10;
  
  const seaLevelPressure = 1013.25;
  const altitude = 44330 * (1 - Math.pow(currentPressure / seaLevelPressure, 1 / 5.255));

  return {
    timestamp: Date.now(),
    temperature: parseFloat(currentTemp.toFixed(1)),
    humidity: parseFloat(currentHumid.toFixed(1)),
    pressure: parseFloat(currentPressure.toFixed(1)),
    altitude: parseFloat(altitude.toFixed(1)),
  };
};

/**
 * Fetches real data from an ESP8266 endpoint.
 * Assumes the ESP8266 returns JSON like: { "temperature": 25.5, "humidity": 60, "pressure": 1012.1 }
 */
export const fetchRealReading = async (ip: string): Promise<SensorReading> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

  try {
    // Try both http and https if needed, but usually local ESP8266 is http
    const response = await fetch(`http://${ip}/data`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('Device response not ok');
    
    const json = await response.json();
    
    // Calculate altitude if not provided by device
    const seaLevelPressure = 1013.25;
    const altitude = json.altitude || (44330 * (1 - Math.pow(json.pressure / seaLevelPressure, 1 / 5.255)));

    return {
      timestamp: Date.now(),
      temperature: parseFloat(json.temperature),
      humidity: parseFloat(json.humidity),
      pressure: parseFloat(json.pressure),
      altitude: parseFloat(altitude.toFixed(1)),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Simulates fetching 24 hours of historical data.
 */
export const getHistoricalData = async (dateStr: string): Promise<SensorReading[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const startDate = new Date(dateStr);
  const data: SensorReading[] = [];
  
  for (let i = 0; i < 48; i++) {
    const pointTime = new Date(startDate);
    pointTime.setHours(0, i * 30, 0, 0);
    const timestamp = pointTime.getTime();
    const hour = i / 2;
    const tempCycle = -Math.cos(((hour - 4) / 24) * 2 * Math.PI); 
    const baseTemp = 22 + tempCycle * 5;
    const baseHumid = 60 - tempCycle * 20;
    const randomPressure = 1013 + (Math.random() - 0.5) * 5;
    const altitude = 44330 * (1 - Math.pow(randomPressure / 1013.25, 1 / 5.255));

    data.push({
      timestamp,
      temperature: parseFloat((baseTemp + (Math.random() - 0.5) * 2).toFixed(1)),
      humidity: parseFloat((baseHumid + (Math.random() - 0.5) * 5).toFixed(1)),
      pressure: parseFloat(randomPressure.toFixed(1)),
      altitude: parseFloat(altitude.toFixed(1)),
    });
  }
  return data;
};
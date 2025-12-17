export interface SensorReading {
  timestamp: number;
  temperature: number; // Celsius (DHT22)
  humidity: number;    // % (DHT22)
  pressure: number;    // hPa (BMP280)
  altitude: number;    // Meters (Derived from BMP280)
}

export type SoundType = 'beep' | 'alarm' | 'chime';

export interface Thresholds {
  tempMin: number;
  tempMax: number;
  humidMin: number;
  humidMax: number;
  soundEnabled: boolean;
  soundType: SoundType;
}

export interface AlertState {
  isTempAlert: boolean;
  isHumidAlert: boolean;
  message?: string;
}

export enum ConnectionStatus {
  DISCONNECTED = '未连接',
  CONNECTING = '连接中...',
  CONNECTED_MOCK = '模拟连接 (演示)',
  CONNECTED_REAL = '正式连接 (ESP8266)',
  ERROR = '没有找到设备',
}
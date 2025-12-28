import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Device, DeviceRegistration, DeviceStatus, DeviceReading } from '../types';
import { WaterService } from './water.service';

export class DeviceService {
  private waterService: WaterService;

  constructor(private db: Database) {
    this.waterService = new WaterService(db);
  }

  async registerDevice(userId: string, registration: DeviceRegistration): Promise<{ device: Device; apiKey: string }> {
    const deviceId = uuidv4();
    const apiKey = this.generateApiKey();

    await this.db.run(
      `INSERT INTO devices (id, user_id, device_name, device_type, location, mac_address, api_key, firmware_version, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      deviceId,
      userId,
      registration.device_name,
      registration.device_type,
      registration.location || null,
      registration.mac_address || null,
      apiKey,
      registration.firmware_version || null,
      1
    );

    const statusId = uuidv4();
    await this.db.run(
      `INSERT INTO device_status (id, device_id, is_online, battery_level, signal_strength)
       VALUES (?, ?, ?, ?, ?)`,
      statusId,
      deviceId,
      0,
      100,
      0
    );

    const device = await this.db.get('SELECT * FROM devices WHERE id = ?', deviceId);

    return { device, apiKey };
  }

  async authenticateDevice(deviceId: string, apiKey: string): Promise<Device | null> {
    const device = await this.db.get(
      'SELECT * FROM devices WHERE id = ? AND api_key = ? AND is_active = 1',
      deviceId,
      apiKey
    );

    return device || null;
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    return await this.db.all('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC', userId);
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    return await this.db.get('SELECT * FROM devices WHERE id = ?', deviceId);
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
    return await this.db.get('SELECT * FROM device_status WHERE device_id = ?', deviceId);
  }

  async updateDeviceStatus(
    deviceId: string,
    status: {
      battery_level?: number;
      signal_strength?: number;
      is_online?: boolean;
      ip_address?: string;
      uptime_seconds?: number;
      last_error?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (status.battery_level !== undefined) {
      fields.push('battery_level = ?');
      values.push(status.battery_level);
    }

    if (status.signal_strength !== undefined) {
      fields.push('signal_strength = ?');
      values.push(status.signal_strength);
    }

    if (status.is_online !== undefined) {
      fields.push('is_online = ?');
      values.push(status.is_online ? 1 : 0);
    }

    if (status.ip_address) {
      fields.push('ip_address = ?');
      values.push(status.ip_address);
    }

    if (status.uptime_seconds !== undefined) {
      fields.push('uptime_seconds = ?');
      values.push(status.uptime_seconds);
    }

    if (status.last_error) {
      fields.push('last_error = ?');
      fields.push('error_count = error_count + 1');
      values.push(status.last_error);
    }

    fields.push('last_seen = CURRENT_TIMESTAMP');
    fields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(deviceId);

    await this.db.run(
      `UPDATE device_status SET ${fields.join(', ')} WHERE device_id = ?`,
      ...values
    );
  }

  async saveReading(deviceId: string, reading: {
    flow_rate?: number;
    total_volume?: number;
    temperature?: number;
    pressure?: number;
    timestamp?: string;
  }): Promise<DeviceReading> {
    const readingId = uuidv4();
    const timestamp = reading.timestamp || new Date().toISOString();

    await this.db.run(
      `INSERT INTO device_readings (id, device_id, flow_rate, total_volume, temperature, pressure, reading_timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      readingId,
      deviceId,
      reading.flow_rate || null,
      reading.total_volume || null,
      reading.temperature || null,
      reading.pressure || null,
      timestamp,
      1
    );

    const saved = await this.db.get('SELECT * FROM device_readings WHERE id = ?', readingId);
    return saved;
  }

  async processWaterUsage(deviceId: string, volume: number, activityType?: string): Promise<any> {
    const device = await this.getDeviceById(deviceId);

    if (!device) {
      throw new Error('Device not found');
    }

    const usage = await this.waterService.recordUsage(device.user_id, {
      amount: volume,
      unit: 'liters',
      device_id: deviceId,
      activity_type: activityType || device.device_type
    });

    return usage;
  }

  async getDeviceReadings(deviceId: string, limit: number = 100): Promise<DeviceReading[]> {
    return await this.db.all(
      'SELECT * FROM device_readings WHERE device_id = ? ORDER BY reading_timestamp DESC LIMIT ?',
      deviceId,
      limit
    );
  }

  async updateDevice(deviceId: string, updates: {
    device_name?: string;
    location?: string;
    is_active?: boolean;
  }): Promise<Device> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.device_name) {
      fields.push('device_name = ?');
      values.push(updates.device_name);
    }

    if (updates.location !== undefined) {
      fields.push('location = ?');
      values.push(updates.location);
    }

    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(deviceId);

    await this.db.run(
      `UPDATE devices SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );

    const device = await this.db.get('SELECT * FROM devices WHERE id = ?', deviceId);
    return device;
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.db.run('DELETE FROM devices WHERE id = ?', deviceId);
  }

  async regenerateApiKey(deviceId: string): Promise<string> {
    const newApiKey = this.generateApiKey();

    await this.db.run(
      'UPDATE devices SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      newApiKey,
      deviceId
    );

    return newApiKey;
  }

  async setDeviceConfig(deviceId: string, key: string, value: string): Promise<void> {
    const existing = await this.db.get(
      'SELECT id FROM device_configs WHERE device_id = ? AND config_key = ?',
      deviceId,
      key
    );

    if (existing) {
      await this.db.run(
        'UPDATE device_configs SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        value,
        existing.id
      );
    } else {
      const configId = uuidv4();
      await this.db.run(
        'INSERT INTO device_configs (id, device_id, config_key, config_value) VALUES (?, ?, ?, ?)',
        configId,
        deviceId,
        key,
        value
      );
    }
  }

  async getDeviceConfig(deviceId: string, key: string): Promise<string | null> {
    const config = await this.db.get(
      'SELECT config_value FROM device_configs WHERE device_id = ? AND config_key = ?',
      deviceId,
      key
    );

    return config?.config_value || null;
  }

  async getDeviceConfigs(deviceId: string): Promise<any> {
    const configs = await this.db.all(
      'SELECT config_key, config_value FROM device_configs WHERE device_id = ?',
      deviceId
    );

    const configMap: any = {};
    for (const config of configs) {
      configMap[config.config_key] = config.config_value;
    }

    return configMap;
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

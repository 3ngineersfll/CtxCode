import { Router } from 'express';
import { DeviceService } from '../services/device.service';
import { ChallengeService } from '../services/challenge.service';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Middleware to authenticate device API key
async function deviceAuthMiddleware(req: any, res: any, next: any) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id required' });
    }

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const device = await deviceService.authenticateDevice(device_id, apiKey as string);

    if (!device) {
      return res.status(401).json({ error: 'Invalid device credentials' });
    }

    req.device = device;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Register a new device
router.post('/register', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { device_name, device_type, location, mac_address, firmware_version } = req.body;

    if (!device_name || !device_type) {
      return res.status(400).json({ error: 'device_name and device_type are required' });
    }

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const result = await deviceService.registerDevice(req.user!.userId, {
      device_name,
      device_type,
      location,
      mac_address,
      firmware_version
    });

    res.status(201).json({
      device: result.device,
      api_key: result.apiKey,
      message: 'Device registered successfully. Store the API key securely!'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's devices
router.get('/my-devices', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const devices = await deviceService.getUserDevices(req.user!.userId);

    const devicesWithStatus = await Promise.all(
      devices.map(async (device) => {
        const status = await deviceService.getDeviceStatus(device.id);
        return { ...device, status };
      })
    );

    res.json({ devices: devicesWithStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get device details
router.get('/:deviceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const device = await deviceService.getDeviceById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const status = await deviceService.getDeviceStatus(deviceId);
    const readings = await deviceService.getDeviceReadings(deviceId, 50);

    res.json({ device, status, recent_readings: readings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update device
router.patch('/:deviceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;
    const { device_name, location, is_active } = req.body;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const device = await deviceService.getDeviceById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await deviceService.updateDevice(deviceId, {
      device_name,
      location,
      is_active
    });

    res.json({ device: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete device
router.delete('/:deviceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const device = await deviceService.getDeviceById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await deviceService.deleteDevice(deviceId);

    res.json({ message: 'Device deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate API key
router.post('/:deviceId/regenerate-key', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const device = await deviceService.getDeviceById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newApiKey = await deviceService.regenerateApiKey(deviceId);

    res.json({ api_key: newApiKey, message: 'API key regenerated. Update your device!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Device API: Report water usage
router.post('/api/report', deviceAuthMiddleware, async (req: any, res) => {
  try {
    const { device_id, volume, activity_type, battery_level, signal_strength } = req.body;

    if (!volume || volume <= 0) {
      return res.status(400).json({ error: 'Invalid volume' });
    }

    const db = await getDatabase();
    const deviceService = new DeviceService(db);
    const challengeService = new ChallengeService(db);

    // Update device status
    await deviceService.updateDeviceStatus(device_id, {
      is_online: true,
      battery_level,
      signal_strength
    });

    // Process water usage
    const usage = await deviceService.processWaterUsage(device_id, volume, activity_type);

    // Update challenges
    const device = req.device;
    const completedChallenges = await challengeService.updateChallengeProgress(device.user_id);

    res.json({
      success: true,
      usage,
      completed_challenges: completedChallenges.length,
      message: 'Water usage recorded successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Device API: Send status update
router.post('/api/status', deviceAuthMiddleware, async (req: any, res) => {
  try {
    const { device_id, battery_level, signal_strength, uptime_seconds, ip_address, error } = req.body;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    await deviceService.updateDeviceStatus(device_id, {
      is_online: true,
      battery_level,
      signal_strength,
      uptime_seconds,
      ip_address,
      last_error: error
    });

    res.json({ success: true, message: 'Status updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Device API: Send sensor reading
router.post('/api/reading', deviceAuthMiddleware, async (req: any, res) => {
  try {
    const { device_id, flow_rate, total_volume, temperature, pressure } = req.body;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const reading = await deviceService.saveReading(device_id, {
      flow_rate,
      total_volume,
      temperature,
      pressure
    });

    res.json({ success: true, reading });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Device API: Get configuration
router.post('/api/config', deviceAuthMiddleware, async (req: any, res) => {
  try {
    const { device_id } = req.body;

    const db = await getDatabase();
    const deviceService = new DeviceService(db);

    const config = await deviceService.getDeviceConfigs(device_id);

    res.json({ config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

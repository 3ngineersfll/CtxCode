import { useState, useEffect } from 'react';
import axios from 'axios';

function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    device_name: '',
    device_type: 'flow_sensor',
    location: '',
    mac_address: '',
    firmware_version: ''
  });

  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await axios.get('/api/devices/my-devices');
      setDevices(response.data.devices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await axios.post('/api/devices/register', formData);
      setMessage('Device registered successfully! Save your API key securely.');
      setShowApiKey(response.data.api_key);

      setFormData({
        device_name: '',
        device_type: 'flow_sensor',
        location: '',
        mac_address: '',
        firmware_version: ''
      });

      await loadDevices();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to register device');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      await axios.delete(`/api/devices/${deviceId}`);
      setMessage('Device deleted successfully');
      await loadDevices();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to delete device');
    }
  };

  const handleRegenerateKey = async (deviceId: string) => {
    if (!window.confirm('Regenerating API key will break existing device connection. Continue?')) {
      return;
    }

    try {
      const response = await axios.post(`/api/devices/${deviceId}/regenerate-key`);
      setMessage('API key regenerated. Update your device!');
      setShowApiKey(response.data.api_key);
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to regenerate key');
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    const icons: any = {
      flow_sensor: '🚰',
      smart_valve: '🔧',
      leak_detector: '💧',
      moisture_sensor: '🌱'
    };
    return icons[type] || '📟';
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? '#27ae60' : '#e74c3c';
  };

  const getBatteryIcon = (level: number | undefined) => {
    if (!level) return '🔌';
    if (level > 75) return '🔋';
    if (level > 25) return '🪫';
    return '⚠️';
  };

  if (loading) {
    return <div className="loading">Loading devices...</div>;
  }

  return (
    <div>
      {message && (
        <div className={message.includes('Failed') ? 'error' : 'success'} style={{ marginBottom: '16px' }}>
          {message}
        </div>
      )}

      {showApiKey && (
        <div className="card" style={{ background: '#fff3cd', border: '2px solid #ffc107', marginBottom: '16px' }}>
          <h3 style={{ color: '#856404', marginBottom: '12px' }}>⚠️ Save Your API Key!</h3>
          <p style={{ marginBottom: '12px', color: '#856404' }}>
            This is the only time you'll see this API key. Copy it now and configure your device.
          </p>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all' }}>
            {showApiKey}
          </div>
          <button className="btn btn-secondary" onClick={() => setShowApiKey(null)} style={{ marginTop: '12px' }}>
            I've Saved It
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>My IoT Devices</h2>
          <button className="btn btn-primary" onClick={() => setShowRegisterForm(!showRegisterForm)}>
            {showRegisterForm ? 'Cancel' : '+ Register Device'}
          </button>
        </div>

        {showRegisterForm && (
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Register New Device</h3>
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Device Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    placeholder="e.g., Kitchen Sink Sensor"
                    required
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Device Type *</label>
                  <select
                    className="input"
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    style={{ marginBottom: 0 }}
                  >
                    <option value="flow_sensor">Flow Sensor</option>
                    <option value="smart_valve">Smart Valve</option>
                    <option value="leak_detector">Leak Detector</option>
                    <option value="moisture_sensor">Moisture Sensor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Location</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Kitchen"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>MAC Address</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.mac_address}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    placeholder="e.g., AA:BB:CC:DD:EE:FF"
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                Register Device
              </button>
            </form>
          </div>
        )}

        {devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📟</div>
            <p>No devices registered yet.</p>
            <p style={{ marginTop: '8px' }}>Register your first IoT water sensor to start automated tracking!</p>
          </div>
        ) : (
          <div>
            {devices.map((device) => (
              <div key={device.id} style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '32px' }}>{getDeviceTypeIcon(device.device_type)}</span>
                      <div>
                        <h3 style={{ margin: 0 }}>{device.device_name}</h3>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          {device.location && `📍 ${device.location} • `}
                          ID: {device.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#999' }}>Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: getStatusColor(device.status?.is_online)
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>
                            {device.status?.is_online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {device.status?.battery_level !== null && device.status?.battery_level !== undefined && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999' }}>Battery</div>
                          <div style={{ marginTop: '4px', fontWeight: 600 }}>
                            {getBatteryIcon(device.status.battery_level)} {device.status.battery_level}%
                          </div>
                        </div>
                      )}

                      {device.status?.signal_strength && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999' }}>Signal</div>
                          <div style={{ marginTop: '4px', fontWeight: 600 }}>
                            📶 {device.status.signal_strength} dBm
                          </div>
                        </div>
                      )}

                      {device.status?.last_seen && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999' }}>Last Seen</div>
                          <div style={{ marginTop: '4px', fontWeight: 600 }}>
                            {new Date(device.status.last_seen).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                    >
                      {selectedDevice?.id === device.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRegenerateKey(device.id)}
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                    >
                      🔑 Key
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDelete(device.id)}
                      style={{ padding: '6px 12px', fontSize: '14px', background: '#e74c3c', color: 'white' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {selectedDevice?.id === device.id && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#fff', borderRadius: '6px' }}>
                    <h4 style={{ marginBottom: '12px' }}>Device Details</h4>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      <div><strong>Device ID:</strong> {device.id}</div>
                      <div><strong>MAC Address:</strong> {device.mac_address || 'N/A'}</div>
                      <div><strong>Firmware:</strong> {device.firmware_version || 'N/A'}</div>
                      <div><strong>Registered:</strong> {new Date(device.created_at).toLocaleDateString()}</div>
                      {device.status?.ip_address && (
                        <div><strong>IP Address:</strong> {device.status.ip_address}</div>
                      )}
                      {device.status?.uptime_seconds && (
                        <div><strong>Uptime:</strong> {Math.floor(device.status.uptime_seconds / 3600)}h {Math.floor((device.status.uptime_seconds % 3600) / 60)}m</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Setup Instructions</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Register your device using the form above to get your API key</li>
          <li>Download Arduino sketch from <code>/arduino/WaterFlowSensor/</code></li>
          <li>Install required libraries: PubSubClient, ArduinoJson</li>
          <li>Update sketch with your WiFi credentials, server IP, Device ID, and API Key</li>
          <li>Upload to your ESP32 board</li>
          <li>Connect YF-S201 flow sensor to GPIO 4</li>
          <li>Power on and monitor Serial output for connection status</li>
          <li>Water usage will automatically sync to your dashboard!</li>
        </ol>
        <p style={{ marginTop: '16px', padding: '12px', background: '#e8f4f8', borderRadius: '6px' }}>
          💡 <strong>Tip:</strong> See <code>/arduino/README.md</code> for complete hardware setup guide including wiring diagrams and troubleshooting.
        </p>
      </div>
    </div>
  );
}

export default Devices;

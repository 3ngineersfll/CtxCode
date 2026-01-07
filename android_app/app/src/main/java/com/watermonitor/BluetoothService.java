package com.watermonitor;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

public class BluetoothService {
    private static final String TAG = "BluetoothService";
    private static final UUID MY_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private ConnectThread connectThread;
    private ConnectedThread connectedThread;
    private ConnectionListener connectionListener;

    public interface ConnectionListener {
        void onConnected();
        void onDisconnected();
        void onDataReceived(String data);
        void onError(String error);
    }

    public BluetoothService() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    public boolean isBluetoothAvailable() {
        return bluetoothAdapter != null;
    }

    public boolean isBluetoothEnabled() {
        return bluetoothAdapter != null && bluetoothAdapter.isEnabled();
    }

    public void setConnectionListener(ConnectionListener listener) {
        this.connectionListener = listener;
    }

    public void connect(BluetoothDevice device) {
        if (connectThread != null) {
            connectThread.cancel();
            connectThread = null;
        }

        if (connectedThread != null) {
            connectedThread.cancel();
            connectedThread = null;
        }

        connectThread = new ConnectThread(device);
        connectThread.start();
    }

    public void disconnect() {
        if (connectThread != null) {
            connectThread.cancel();
            connectThread = null;
        }

        if (connectedThread != null) {
            connectedThread.cancel();
            connectedThread = null;
        }
    }

    public void sendCommand(String command) {
        if (connectedThread != null) {
            connectedThread.write((command + "\n").getBytes());
        }
    }

    private class ConnectThread extends Thread {
        private final BluetoothSocket socket;
        private final BluetoothDevice device;

        public ConnectThread(BluetoothDevice device) {
            this.device = device;
            BluetoothSocket tmp = null;

            try {
                tmp = device.createRfcommSocketToServiceRecord(MY_UUID);
            } catch (IOException e) {
                Log.e(TAG, "Socket create() failed", e);
            }
            socket = tmp;
        }

        public void run() {
            bluetoothAdapter.cancelDiscovery();

            try {
                socket.connect();
                Log.d(TAG, "Connected to device");

                // Start the connected thread
                connectedThread = new ConnectedThread(socket);
                connectedThread.start();

                if (connectionListener != null) {
                    new Handler(Looper.getMainLooper()).post(() ->
                        connectionListener.onConnected()
                    );
                }
            } catch (IOException e) {
                Log.e(TAG, "Connection failed", e);
                try {
                    socket.close();
                } catch (IOException e2) {
                    Log.e(TAG, "Unable to close socket", e2);
                }

                if (connectionListener != null) {
                    new Handler(Looper.getMainLooper()).post(() ->
                        connectionListener.onError("Failed to connect: " + e.getMessage())
                    );
                }
            }
        }

        public void cancel() {
            try {
                socket.close();
            } catch (IOException e) {
                Log.e(TAG, "Close failed", e);
            }
        }
    }

    private class ConnectedThread extends Thread {
        private final BluetoothSocket socket;
        private final InputStream inputStream;
        private final OutputStream outputStream;
        private boolean isRunning = true;

        public ConnectedThread(BluetoothSocket socket) {
            this.socket = socket;
            InputStream tmpIn = null;
            OutputStream tmpOut = null;

            try {
                tmpIn = socket.getInputStream();
                tmpOut = socket.getOutputStream();
            } catch (IOException e) {
                Log.e(TAG, "Error occurred when creating streams", e);
            }

            inputStream = tmpIn;
            outputStream = tmpOut;
        }

        public void run() {
            byte[] buffer = new byte[1024];
            int bytes;
            StringBuilder stringBuilder = new StringBuilder();

            while (isRunning) {
                try {
                    bytes = inputStream.read(buffer);
                    String incomingData = new String(buffer, 0, bytes);

                    stringBuilder.append(incomingData);

                    // Check for complete line
                    int newlineIndex;
                    while ((newlineIndex = stringBuilder.indexOf("\n")) != -1) {
                        String completeLine = stringBuilder.substring(0, newlineIndex).trim();
                        stringBuilder.delete(0, newlineIndex + 1);

                        if (!completeLine.isEmpty() && connectionListener != null) {
                            String finalLine = completeLine;
                            new Handler(Looper.getMainLooper()).post(() ->
                                connectionListener.onDataReceived(finalLine)
                            );
                        }
                    }
                } catch (IOException e) {
                    Log.e(TAG, "Input stream disconnected", e);
                    isRunning = false;

                    if (connectionListener != null) {
                        new Handler(Looper.getMainLooper()).post(() ->
                            connectionListener.onDisconnected()
                        );
                    }
                    break;
                }
            }
        }

        public void write(byte[] bytes) {
            try {
                outputStream.write(bytes);
                outputStream.flush();
            } catch (IOException e) {
                Log.e(TAG, "Error writing to stream", e);
            }
        }

        public void cancel() {
            isRunning = false;
            try {
                socket.close();
            } catch (IOException e) {
                Log.e(TAG, "Could not close socket", e);
            }
        }
    }
}

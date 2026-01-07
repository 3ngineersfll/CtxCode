package com.watermonitor;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private static final int REQUEST_ENABLE_BT = 1;
    private static final int REQUEST_BLUETOOTH_PERMISSIONS = 2;

    private BluetoothService bluetoothService;
    private DatabaseHelper databaseHelper;

    private TextView statusText;
    private TextView flowRateText;
    private TextView totalVolumeText;
    private TextView tipText;
    private Button connectButton;
    private Button historyButton;
    private Button resetButton;

    private boolean isConnected = false;
    private float currentFlowRate = 0.0f;
    private float currentTotalVolume = 0.0f;

    private String[] conservationTips = {
            "Fix leaky faucets - a single drip per second wastes over 3,000 gallons per year!",
            "Turn off the tap while brushing your teeth to save up to 8 gallons per day.",
            "Take shorter showers - reducing time by 2 minutes can save 10 gallons per shower.",
            "Run dishwashers and washing machines only with full loads.",
            "Install low-flow showerheads to reduce water usage by up to 50%.",
            "Collect cold water while waiting for hot water and use it for plants.",
            "Use a broom instead of a hose to clean driveways and sidewalks.",
            "Water plants early in the morning or late evening to minimize evaporation."
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initializeViews();
        initializeServices();
        setupListeners();
        checkBluetoothPermissions();

        // Show a random conservation tip
        showRandomTip();
    }

    private void initializeViews() {
        statusText = findViewById(R.id.statusText);
        flowRateText = findViewById(R.id.flowRateText);
        totalVolumeText = findViewById(R.id.totalVolumeText);
        tipText = findViewById(R.id.tipText);
        connectButton = findViewById(R.id.connectButton);
        historyButton = findViewById(R.id.historyButton);
        resetButton = findViewById(R.id.resetButton);
    }

    private void initializeServices() {
        bluetoothService = new BluetoothService();
        databaseHelper = new DatabaseHelper(this);

        bluetoothService.setConnectionListener(new BluetoothService.ConnectionListener() {
            @Override
            public void onConnected() {
                runOnUiThread(() -> {
                    isConnected = true;
                    updateConnectionStatus();
                    Toast.makeText(MainActivity.this, "Connected successfully", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onDisconnected() {
                runOnUiThread(() -> {
                    isConnected = false;
                    updateConnectionStatus();
                    Toast.makeText(MainActivity.this, "Disconnected", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onDataReceived(String data) {
                runOnUiThread(() -> parseAndDisplayData(data));
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Error: " + error, Toast.LENGTH_SHORT).show()
                );
            }
        });
    }

    private void setupListeners() {
        connectButton.setOnClickListener(v -> {
            if (isConnected) {
                bluetoothService.disconnect();
            } else {
                showDeviceSelectionDialog();
            }
        });

        historyButton.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, HistoryActivity.class);
            startActivity(intent);
        });

        resetButton.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Reset Counter")
                    .setMessage("Are you sure you want to reset the water usage counter?")
                    .setPositiveButton("Reset", (dialog, which) -> {
                        bluetoothService.sendCommand("RESET");
                        currentTotalVolume = 0.0f;
                        totalVolumeText.setText("0.000");
                        Toast.makeText(this, "Counter reset", Toast.LENGTH_SHORT).show();
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        });
    }

    private void checkBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{
                                Manifest.permission.BLUETOOTH_CONNECT,
                                Manifest.permission.BLUETOOTH_SCAN
                        },
                        REQUEST_BLUETOOTH_PERMISSIONS);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                        REQUEST_BLUETOOTH_PERMISSIONS);
            }
        }
    }

    private void showDeviceSelectionDialog() {
        if (!bluetoothService.isBluetoothAvailable()) {
            Toast.makeText(this, "Bluetooth not available", Toast.LENGTH_SHORT).show();
            return;
        }

        if (!bluetoothService.isBluetoothEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                    == PackageManager.PERMISSION_GRANTED) {
                startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
            }
            return;
        }

        BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED) {
            checkBluetoothPermissions();
            return;
        }

        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();

        if (pairedDevices.isEmpty()) {
            Toast.makeText(this, R.string.no_paired_devices, Toast.LENGTH_LONG).show();
            return;
        }

        ArrayList<BluetoothDevice> deviceList = new ArrayList<>(pairedDevices);
        String[] deviceNames = new String[deviceList.size()];

        for (int i = 0; i < deviceList.size(); i++) {
            deviceNames[i] = deviceList.get(i).getName() + "\n" + deviceList.get(i).getAddress();
        }

        new AlertDialog.Builder(this)
                .setTitle(R.string.select_device)
                .setItems(deviceNames, (dialog, which) -> {
                    BluetoothDevice selectedDevice = deviceList.get(which);
                    bluetoothService.connect(selectedDevice);
                    statusText.setText(R.string.connecting);
                    statusText.setTextColor(getColor(R.color.orange));
                })
                .show();
    }

    private void parseAndDisplayData(String data) {
        // Expected format: FLOW:<flowRate>|VOLUME:<totalVolume>|TIME:<millis>
        try {
            String[] parts = data.split("\\|");
            for (String part : parts) {
                String[] keyValue = part.split(":");
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim();
                    String value = keyValue[1].trim();

                    switch (key) {
                        case "FLOW":
                            currentFlowRate = Float.parseFloat(value);
                            flowRateText.setText(String.format("%.2f", currentFlowRate));
                            break;
                        case "VOLUME":
                            currentTotalVolume = Float.parseFloat(value);
                            totalVolumeText.setText(String.format("%.3f", currentTotalVolume));
                            break;
                    }
                }
            }

            // Save to database if flow rate > 0 (water is flowing)
            if (currentFlowRate > 0) {
                databaseHelper.insertUsageData(currentFlowRate, currentTotalVolume);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateConnectionStatus() {
        if (isConnected) {
            statusText.setText(R.string.connected);
            statusText.setTextColor(getColor(R.color.green));
            connectButton.setText(R.string.disconnect);
            connectButton.setBackgroundTintList(ContextCompat.getColorStateList(this, R.color.red));
        } else {
            statusText.setText(R.string.not_connected);
            statusText.setTextColor(getColor(R.color.red));
            connectButton.setText(R.string.connect_bluetooth);
            connectButton.setBackgroundTintList(ContextCompat.getColorStateList(this, R.color.blue_primary));
        }
    }

    private void showRandomTip() {
        int randomIndex = (int) (Math.random() * conservationTips.length);
        tipText.setText(conservationTips[randomIndex]);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (bluetoothService != null) {
            bluetoothService.disconnect();
        }
    }
}

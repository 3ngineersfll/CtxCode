package com.watermonitor;

import android.graphics.Color;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.github.mikephil.charting.charts.BarChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.BarData;
import com.github.mikephil.charting.data.BarDataSet;
import com.github.mikephil.charting.data.BarEntry;
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter;
import com.github.mikephil.charting.formatter.ValueFormatter;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class HistoryActivity extends AppCompatActivity {
    private DatabaseHelper databaseHelper;
    private TextView todayUsageText;
    private TextView weekUsageText;
    private TextView monthUsageText;
    private BarChart barChart;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);

        // Enable back button
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        initializeViews();
        databaseHelper = new DatabaseHelper(this);

        loadStatistics();
        setupChart();
    }

    private void initializeViews() {
        todayUsageText = findViewById(R.id.todayUsageText);
        weekUsageText = findViewById(R.id.weekUsageText);
        monthUsageText = findViewById(R.id.monthUsageText);
        barChart = findViewById(R.id.barChart);
    }

    private void loadStatistics() {
        List<DatabaseHelper.DailyUsageSummary> summaries = databaseHelper.getDailyUsageSummary(30);

        float todayUsage = 0.0f;
        float weekUsage = 0.0f;
        float monthUsage = 0.0f;

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                .format(new Date());

        for (int i = 0; i < summaries.size(); i++) {
            DatabaseHelper.DailyUsageSummary summary = summaries.get(i);
            float volume = summary.getTotalVolume();

            if (i == 0 && summary.getDate().equals(today)) {
                todayUsage = volume;
            }

            if (i < 7) {
                weekUsage += volume;
            }

            monthUsage += volume;
        }

        todayUsageText.setText(String.format(Locale.getDefault(), "%.1f L", todayUsage));
        weekUsageText.setText(String.format(Locale.getDefault(), "%.1f L", weekUsage));
        monthUsageText.setText(String.format(Locale.getDefault(), "%.1f L", monthUsage));
    }

    private void setupChart() {
        List<DatabaseHelper.DailyUsageSummary> summaries = databaseHelper.getDailyUsageSummary(7);

        // Reverse to show oldest to newest
        Collections.reverse(summaries);

        ArrayList<BarEntry> entries = new ArrayList<>();
        ArrayList<String> labels = new ArrayList<>();

        for (int i = 0; i < summaries.size(); i++) {
            DatabaseHelper.DailyUsageSummary summary = summaries.get(i);
            entries.add(new BarEntry(i, summary.getTotalVolume()));

            // Format date as MM/DD
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                SimpleDateFormat outputFormat = new SimpleDateFormat("MM/dd", Locale.getDefault());
                Date date = inputFormat.parse(summary.getDate());
                labels.add(date != null ? outputFormat.format(date) : summary.getDate());
            } catch (Exception e) {
                labels.add(summary.getDate());
            }
        }

        // If no data, show empty chart
        if (entries.isEmpty()) {
            entries.add(new BarEntry(0, 0));
            labels.add("No Data");
        }

        BarDataSet dataSet = new BarDataSet(entries, "Water Usage (Liters)");
        dataSet.setColor(getColor(R.color.blue_primary));
        dataSet.setValueTextColor(Color.BLACK);
        dataSet.setValueTextSize(10f);
        dataSet.setValueFormatter(new ValueFormatter() {
            @Override
            public String getFormattedValue(float value) {
                return String.format(Locale.getDefault(), "%.1f", value);
            }
        });

        BarData barData = new BarData(dataSet);
        barData.setBarWidth(0.8f);

        barChart.setData(barData);
        barChart.getDescription().setEnabled(false);
        barChart.setFitBars(true);
        barChart.animateY(1000);
        barChart.getLegend().setEnabled(false);
        barChart.setDrawValueAboveBar(true);
        barChart.setDrawGridBackground(false);

        // X-Axis configuration
        XAxis xAxis = barChart.getXAxis();
        xAxis.setValueFormatter(new IndexAxisValueFormatter(labels));
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setGranularity(1f);
        xAxis.setGranularityEnabled(true);
        xAxis.setDrawGridLines(false);
        xAxis.setTextColor(Color.BLACK);

        // Y-Axis configuration
        YAxis leftAxis = barChart.getAxisLeft();
        leftAxis.setAxisMinimum(0f);
        leftAxis.setTextColor(Color.BLACK);
        leftAxis.setDrawGridLines(true);
        leftAxis.setGridColor(Color.LTGRAY);

        YAxis rightAxis = barChart.getAxisRight();
        rightAxis.setEnabled(false);

        barChart.invalidate();
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}

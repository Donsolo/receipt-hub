package com.tektriq.verihub;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enable Edge-to-Edge for Android 15+ SDK 35 compliance
        EdgeToEdge.enable(this);
        
        super.onCreate(savedInstanceState);

        // FORCE load your live app
        bridge.getWebView().loadUrl("https://verihub.app");
    }
}
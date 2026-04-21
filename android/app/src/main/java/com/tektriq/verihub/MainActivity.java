package com.tektriq.verihub;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FORCE load your live app
        bridge.getWebView().loadUrl("https://verihub.app");
    }
}
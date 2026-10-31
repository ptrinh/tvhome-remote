package com.gathin.tvhome;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;

/**
 * Screen off for a TV without Sony IP control (BRAVIA 2 II has no key setting): a black window over everything,
 * the sound keeps playing. The panel's backlight stays on, so it hides the picture but saves no power. Any
 * remote button takes it away (the key services ask {@link #dismissOnKey}), as does Screen on from the phone.
 */
final class ScreenBlank {

    private static final String TAG = "TvHomeBlank";
    private static final Handler main = new Handler(Looper.getMainLooper());
    private static View view;

    private ScreenBlank() {
    }

    static boolean showing() {
        return view != null;
    }

    /** False when the launcher may not draw over other apps. */
    static boolean show(Context c) {
        final Context app = c.getApplicationContext();
        if (!Settings.canDrawOverlays(app)) return false;
        main.post(() -> {
            if (view != null) return;
            try {
                View v = new View(app);
                v.setBackgroundColor(Color.BLACK);
                WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                        PixelFormat.OPAQUE);
                app.getSystemService(WindowManager.class).addView(v, lp);
                view = v;
            } catch (Exception e) {
                Log.w(TAG, "no black screen: " + e);
            }
        });
        return true;
    }

    static void hide() {
        main.post(() -> {
            if (view == null) return;
            try {
                view.getContext().getSystemService(WindowManager.class).removeView(view);
            } catch (Exception ignored) {
                // Already gone.
            }
            view = null;
        });
    }

    /** From a key service's onKeyEvent: true consumes the button that brings the picture back. */
    static boolean dismissOnKey(android.view.KeyEvent event) {
        if (view == null) return false;
        if (event.getAction() == android.view.KeyEvent.ACTION_UP) hide();
        return true;
    }
}

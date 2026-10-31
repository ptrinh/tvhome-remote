package com.gathin.tvhome;

import android.content.Context;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * When the TV was last turned off, for the greeting intro's "Last TV usage" line. Recorded on SCREEN_OFF by
 * Home and, when it is on, by the Input button service, which stays alive while other apps are in front.
 */
final class LastUse {

    private static final String PREF = "last_screen_off";

    private LastUse() {
    }

    static void record(Context c) {
        c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).edit()
                .putLong(PREF, System.currentTimeMillis()).apply();
    }

    /** "Last TV usage: 1:25 AM 20 OCT" ("Lần dùng TV gần nhất: 1:25 SA 20/10"), or "" when nothing was recorded yet. */
    static String line(Context c) {
        long at = c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).getLong(PREF, 0);
        if (at == 0) return "";
        Locale locale = Locale.getDefault();
        String when = new SimpleDateFormat(c.getString(R.string.last_tv_usage_date_format), locale)
                .format(new Date(at)).toUpperCase(locale);
        return c.getString(R.string.last_tv_usage, when);
    }
}

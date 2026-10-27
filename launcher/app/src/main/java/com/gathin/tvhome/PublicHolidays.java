package com.gathin.tvhome;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Singapore and Vietnam public holidays, for "Next PH" after the date on the rotating line. A fixed
 * table: Singapore's are MOM's gazetted lists for 2026 and 2027 (Sunday holidays with their Monday in
 * lieu); Vietnam's are the Labour Code days, Tết as mùng 1 to mùng 5 until the government publishes the
 * year's schedule (2026's Tết, before the VN-only option, is left out), Hùng Kings by its solar date, and Vietnamese Culture Day (24 Nov, Resolution
 * 28/2026/QH16). Extend the table each year.
 */
final class PublicHolidays {

    private static final String[][] TABLE = {
            // date, country
            {"2026-01-01", "SG"}, {"2026-01-01", "VN"},
            {"2026-02-17", "SG"}, {"2026-02-18", "SG"},
            {"2026-03-21", "SG"}, {"2026-04-03", "SG"},
            {"2026-04-30", "VN"}, {"2026-05-01", "SG"}, {"2026-05-01", "VN"},
            {"2026-05-27", "SG"}, {"2026-05-31", "SG"}, {"2026-06-01", "SG"},
            {"2026-08-09", "SG"}, {"2026-08-10", "SG"}, {"2026-09-02", "VN"},
            {"2026-11-08", "SG"}, {"2026-11-09", "SG"}, {"2026-11-24", "VN"},
            {"2026-12-25", "SG"},
            {"2027-01-01", "SG"}, {"2027-01-01", "VN"},
            {"2027-02-06", "SG"}, {"2027-02-07", "SG"}, {"2027-02-08", "SG"},
            {"2027-02-06", "VN"}, {"2027-02-07", "VN"}, {"2027-02-08", "VN"}, {"2027-02-09", "VN"}, {"2027-02-10", "VN"},
            {"2027-03-10", "SG"}, {"2027-03-26", "SG"},
            {"2027-04-16", "VN"}, {"2027-04-30", "VN"}, {"2027-05-01", "SG"}, {"2027-05-01", "VN"},
            {"2027-05-17", "SG"}, {"2027-05-20", "SG"},
            {"2027-08-09", "SG"}, {"2027-09-02", "VN"},
            {"2027-10-28", "SG"}, {"2027-11-24", "VN"},
            {"2027-12-25", "SG"},
    };

    private PublicHolidays() {
    }

    /** next(today, both countries, "d MMM" in English): what the tests pin down. */
    static String next(LocalDate today) {
        return next(today, java.util.Arrays.asList("SG", "VN"), "d MMM", Locale.ENGLISH);
    }

    /**
     * "8 NOV (SG)" for the first holiday after today in the given countries, "1 JAN (SG, VN)" when both
     * share it, and no country at all when only one is asked for ("24 NOV"); null past the end of the
     * table or with no countries.
     */
    static String next(LocalDate today, List<String> countries, String pattern, Locale locale) {
        LocalDate best = null;
        List<String> where = new ArrayList<>();
        for (String[] row : TABLE) {
            if (!countries.contains(row[1])) continue;
            LocalDate d = LocalDate.parse(row[0]);
            if (!d.isAfter(today)) continue;
            if (best == null || d.isBefore(best)) {
                best = d;
                where.clear();
            }
            if (d.equals(best) && !where.contains(row[1])) where.add(row[1]);
        }
        if (best == null) return null;
        String day = best.format(DateTimeFormatter.ofPattern(pattern, locale)).toUpperCase(locale);
        return countries.size() == 1 ? day : day + " (" + String.join(", ", where) + ")";
    }
}

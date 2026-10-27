package com.gathin.tvhome;

import java.time.LocalDate;

/**
 * The Vietnamese lunar date (âm lịch) of a Gregorian day, for the greeting line's turn after the date.
 * Hồ Ngọc Đức's algorithm (new moons and major solar terms from astronomical formulas) in Vietnamese time,
 * UTC+7, the same that worked out Occasions.TET_DATES. Plain Java, so it is unit tested.
 */
final class LunarDate {

    private static final double TIME_ZONE = 7.0;
    private static final String[] CAN = {"Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"};
    private static final String[] CHI = {"Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"};

    final int day, month, year;
    final boolean leap;

    private LunarDate(int day, int month, int year, boolean leap) {
        this.day = day;
        this.month = month;
        this.year = year;
        this.leap = leap;
    }

    /** "Bính Ngọ" for the lunar year (the year Tết starts). */
    String yearName() {
        return CAN[(year + 6) % 10] + " " + CHI[(year + 8) % 12];
    }

    static LunarDate of(LocalDate date) {
        int dayNumber = (int) date.toEpochDay() + 2440588;   // Julian day number
        int k = (int) Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
        int monthStart = newMoonDay(k + 1);
        if (monthStart > dayNumber) monthStart = newMoonDay(k);
        int a11 = lunarMonth11(date.getYear());
        int b11 = a11;
        int lunarYear;
        if (a11 >= monthStart) {
            lunarYear = date.getYear();
            a11 = lunarMonth11(date.getYear() - 1);
        } else {
            lunarYear = date.getYear() + 1;
            b11 = lunarMonth11(date.getYear() + 1);
        }
        int day = dayNumber - monthStart + 1;
        int diff = (int) Math.floor((monthStart - a11) / 29.0);
        boolean leap = false;
        int month = diff + 11;
        if (b11 - a11 > 365) {
            int leapDiff = leapMonthOffset(a11);
            if (diff >= leapDiff) {
                month = diff + 10;
                if (diff == leapDiff) leap = true;
            }
        }
        if (month > 12) month -= 12;
        if (month >= 11 && diff < 4) lunarYear -= 1;
        return new LunarDate(day, month, lunarYear, leap);
    }

    /** Julian day of the k-th new moon since 1 January 1900, in local time. */
    private static int newMoonDay(int k) {
        double t = k / 1236.85;
        double t2 = t * t, t3 = t2 * t, dr = Math.PI / 180;
        double jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
                + 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
        double m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
        double mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
        double f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
        double c1 = (0.1734 - 0.000393 * t) * Math.sin(m * dr) + 0.0021 * Math.sin(2 * dr * m)
                - 0.4068 * Math.sin(mpr * dr) + 0.0161 * Math.sin(dr * 2 * mpr) - 0.0004 * Math.sin(dr * 3 * mpr)
                + 0.0104 * Math.sin(dr * 2 * f) - 0.0051 * Math.sin(dr * (m + mpr)) - 0.0074 * Math.sin(dr * (m - mpr))
                + 0.0004 * Math.sin(dr * (2 * f + m)) - 0.0004 * Math.sin(dr * (2 * f - m))
                - 0.0006 * Math.sin(dr * (2 * f + mpr)) + 0.0010 * Math.sin(dr * (2 * f - mpr))
                + 0.0005 * Math.sin(dr * (2 * mpr + m));
        double deltaT = t < -11 ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
                : -0.000278 + 0.000265 * t + 0.000262 * t2;
        return (int) Math.floor(jd1 + c1 - deltaT + 0.5 + TIME_ZONE / 24);
    }

    /** Sun's longitude at local midnight of the Julian day, as one of 12 sectors (0 = from the spring equinox). */
    private static int sunSector(int dayNumber) {
        double t = (dayNumber - 2451545.5 - TIME_ZONE / 24) / 36525;
        double t2 = t * t, dr = Math.PI / 180;
        double m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
        double l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
        double dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m)
                + (0.019993 - 0.000101 * t) * Math.sin(dr * 2 * m) + 0.000290 * Math.sin(dr * 3 * m);
        double l = (l0 + dl) * dr;
        l = l - Math.PI * 2 * Math.floor(l / (Math.PI * 2));
        return (int) Math.floor(l / Math.PI * 6);
    }

    /** Julian day the 11th lunar month (the one with the winter solstice) starts, in the Gregorian year. */
    private static int lunarMonth11(int year) {
        int off = (int) LocalDate.of(year, 12, 31).toEpochDay() + 2440588 - 2415021;
        int k = (int) Math.floor(off / 29.530588853);
        int nm = newMoonDay(k);
        if (sunSector(nm) >= 9) nm = newMoonDay(k - 1);
        return nm;
    }

    /** In a 13-month year starting at a11: how many months after the 11th the leap month falls. */
    private static int leapMonthOffset(int a11) {
        int k = (int) Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        int last;
        int i = 1;
        int arc = sunSector(newMoonDay(k + i));
        do {
            last = arc;
            i++;
            arc = sunSector(newMoonDay(k + i));
        } while (arc != last && i < 14);
        return i - 1;
    }
}

package com.gathin.tvhome;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.time.LocalDate;

public class LunarDateTest {

    private static String text(LunarDate l) {
        return l.day + "/" + l.month + (l.leap ? " nhuận" : "") + " " + l.yearName();
    }

    @Test
    public void knownDays() {
        assertEquals("1/1 Bính Ngọ", text(LunarDate.of(LocalDate.of(2026, 2, 17))));
        assertEquals("29/12 Ất Tỵ", text(LunarDate.of(LocalDate.of(2026, 2, 16))));       // no 30 Tết in 2026
        assertEquals("1/1 Đinh Mùi", text(LunarDate.of(LocalDate.of(2027, 2, 6))));
        assertEquals("15/8 Ất Tỵ", text(LunarDate.of(LocalDate.of(2025, 10, 6))));          // Trung thu 2025
        assertEquals("1/6 nhuận Ất Tỵ", text(LunarDate.of(LocalDate.of(2025, 7, 25))));     // 2025 has a leap 6th month
        assertEquals("10/3 Bính Ngọ", text(LunarDate.of(LocalDate.of(2026, 4, 26))));       // Giỗ Tổ Hùng Vương 2026
    }

    @Test
    public void agreesWithTheTetTable() {
        for (int y = 2026; y <= 2040; y++) {
            for (int m = 1; m <= 2; m++) {
                for (int d = 1; d <= LocalDate.of(y, m, 1).lengthOfMonth(); d++) {
                    LunarDate l = LunarDate.of(LocalDate.of(y, m, d));
                    if (l.day == 1 && l.month == 1 && !l.leap) {
                        assertTrue(y + "-" + m + "-" + d, Occasions.isTet(LocalDate.of(y, m, d)));
                    }
                }
            }
        }
    }
}

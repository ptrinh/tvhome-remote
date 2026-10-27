package com.gathin.tvhome;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

import java.time.LocalDate;

public class PublicHolidaysTest {

    @Test
    public void nextHolidayInEitherCountry() {
        assertEquals("8 NOV (SG)", PublicHolidays.next(LocalDate.of(2026, 10, 23)));
        assertEquals("24 NOV (VN)", PublicHolidays.next(LocalDate.of(2026, 11, 9)));     // today's is not "next"
        assertEquals("1 JAN (SG, VN)", PublicHolidays.next(LocalDate.of(2026, 12, 25)));
        assertEquals("6 FEB (SG, VN)", PublicHolidays.next(LocalDate.of(2027, 1, 1)));   // Chinese New Year and Tết
        assertNull(PublicHolidays.next(LocalDate.of(2027, 12, 25)));
    }

    @Test
    public void oneCountryHasNoCountrySuffix() {
        java.util.List<String> vn = java.util.Collections.singletonList("VN");
        assertEquals("24/11", PublicHolidays.next(LocalDate.of(2026, 10, 27), vn, "d/M", java.util.Locale.ROOT));
        assertEquals("6 FEB", PublicHolidays.next(LocalDate.of(2027, 1, 1), vn, "d MMM", java.util.Locale.ENGLISH));   // Tết
        assertEquals("16 APR", PublicHolidays.next(LocalDate.of(2027, 2, 10), vn, "d MMM", java.util.Locale.ENGLISH));
        assertNull(PublicHolidays.next(LocalDate.of(2026, 10, 27), java.util.Collections.emptyList(), "d MMM", java.util.Locale.ENGLISH));
    }

    @Test
    public void countriesFromConfig() {
        assertEquals(java.util.Arrays.asList("SG", "VN"), Config.countries(" sg, VN ,vn"));
        assertEquals(java.util.Collections.emptyList(), Config.countries(""));
    }
}

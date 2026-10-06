package com.treinoapp.app.nativebridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNull
import org.junit.Test

class CardioMathTest {
    private fun segment(id: String, start: Long = 1_000_000L, end: Long = 2_800_000L, meters: Double = 5000.0, pkg: String = "com.sec.android.app.shealth") =
        CardioMath.DistanceSegment(id, pkg, start, end, meters)

    @Test fun distanceExactSessionAndDeduplicatedSegments() {
        val s = row("a")
        val result = CardioMath.distance(s, listOf(segment("1"), segment("1"), segment("other", pkg = "other")))
        assertEquals(5000.0, result.meters!!, 0.001); assertTrue(result.complete); assertEquals(1.0, result.coverage!!, 0.001)
    }
    @Test fun distancePartialIsNotCompleteAndZeroIsNotMissing() {
        val partial = CardioMath.distance(row("a"), listOf(segment("1", end = 1_900_000L)))
        assertFalse(partial.complete); assertEquals(0.5, partial.coverage!!, 0.001)
        val zero = CardioMath.distance(row("a"), listOf(segment("1", meters = 0.0)))
        assertEquals(0.0, zero.meters!!, 0.0); assertTrue(zero.complete)
        assertNull(CardioMath.distance(row("a"), emptyList()).meters)
    }
    @Test fun distanceRefusesSpanningDailyOverlapAndAmbiguousSession() {
        assertNull(CardioMath.distance(row("a"), listOf(segment("day", start = 1L))).meters)
        assertEquals("overlapping_records", CardioMath.distance(row("a"), listOf(segment("1"), segment("2"))).reason)
        assertEquals("ambiguous_interval", CardioMath.distance(row("a"), listOf(segment("1")), true).reason)
    }
    @Test fun distanceRejectsInvalidAndAcceptsAdjacentCoverage() {
        assertNull(CardioMath.distance(row("a"), listOf(segment("1", meters = Double.NaN))).meters)
        assertNull(CardioMath.distance(row("a"), listOf(segment("1", meters = -1.0))).meters)
        val result = CardioMath.distance(row("a"), listOf(segment("1", end = 1_900_000L, meters = 1000.0), segment("2", start = 1_900_000L, meters = 2000.0)))
        assertTrue(result.complete); assertEquals(3000.0, result.meters!!, 0.001)
    }
    private fun row(id: String, pkg: String = "com.sec.android.app.shealth", start: Long = 1_000_000L, kind: String = "walking") =
        CardioSession(id, pkg, pkg, kind, "", "2026-10-05", start, start + 1_800_000L)

    @Test fun duplicateSourceIdOnlyCountedOnce() {
        assertEquals(1, CardioMath.deduplicate(listOf(row("a"), row("a"))).size)
    }
    @Test fun mirroredSessionPrefersSamsung() {
        val rows = CardioMath.deduplicate(listOf(row("fit", "fit", 1_015_000L), row("samsung")))
        assertEquals(1, rows.size); assertEquals("samsung", rows[0].id)
    }
    @Test fun consecutiveAndDifferentTypesRemain() {
        assertEquals(3, CardioMath.deduplicate(listOf(row("a"), row("b", start = 2_800_000L), row("c", "fit", kind = "cycling"))).size)
    }
    @Test fun differentIdsSameSourceAreNotMerged() {
        assertEquals(2, CardioMath.deduplicate(listOf(row("a"), row("b"))).size)
    }
    @Test fun invalidIntervalsDiscardedAndDurationExact() {
        assertEquals(30.0, row("a").minutes, 0.001)
        assertEquals(0, CardioMath.deduplicate(listOf(row("a").copy(endMs = 1L))).size)
    }

    @Test fun deduplicationPreservesReadTimesAndCalorieStatus() {
        val original = row("samsung").copy(sessionReadAt = 5000L, kcalReadAt = 5500L,
            kcalCheckedAt = 5500L, kcalReadState = "ok")
        val result = CardioMath.deduplicate(listOf(row("fit", "fit", 1_015_000L), original)).single()
        assertEquals(5000L, result.sessionReadAt); assertEquals(5500L, result.kcalReadAt)
        assertEquals("ok", result.kcalReadState)
    }

    @Test fun failedReadHasCheckTimeButNoSuccessfulReadTime() {
        val failed = ActivityReadStatus(6000L, null, "error")
        assertEquals(6000L, failed.checkedAt); assertEquals(null, failed.readAt)
        val success = ActivityReadStatus(7000L, 7000L, "ok")
        assertEquals(success.checkedAt, success.readAt)
    }
}

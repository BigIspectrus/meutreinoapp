package com.treinoapp.app.nativebridge

import org.junit.Assert.assertEquals
import org.junit.Test

class CardioMathTest {
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
}

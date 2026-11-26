package com.treinoapp.watchlink

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutSnapshotTest {
    private val session = WorkoutSnapshot("a", true, "Treino A", "Remada", 2, 4, 1, 12,
        false, false, 100_000L, 42_000L, 115_000L)

    @Test fun restAndWorkoutAdvanceIndependentlyBetweenUpdates() {
        assertEquals(44_000L, session.elapsedAt(102_000L))
        assertEquals(13_000L, session.restAt(102_000L))
        assertEquals(0L, session.restAt(120_000L))
    }

    @Test fun pauseAndFinishFreezeTheWorkout() {
        assertEquals(42_000L, session.copy(paused = true).elapsedAt(112_000L))
        assertEquals(42_000L, session.copy(active = false).elapsedAt(112_000L))
        assertEquals(0L, session.copy(active = false).restAt(112_000L))
    }

    @Test fun staleDataDoesNotContinueIncreasingElapsedTime() {
        assertTrue(session.isFresh(149_000L))
        assertFalse(session.isFresh(151_000L))
        assertEquals(92_000L, session.elapsedAt(999_000L))
        assertEquals(42_000L, session.elapsedAt(99_000L))
    }
}

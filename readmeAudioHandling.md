### Web Audio API: The "Anti-Rattle" Synthesis Technique

## Overview
This document details a specific audio engineering challenge encountered in real-time web audio (specifically in **Attack Mode** of the Swarm Engine) and the technical solution used to fix it.

When triggering procedurally generated sounds rapidly (high-frequency impulse triggering), developers often encounter "rattling," "zipper noise," or "pops." This technique eliminates those artifacts to create liquid-smooth, seamless audio events.

---

## 1. The Symptoms
Even when the rate of impact was low, the audio engine exhibited:
*   **Digital Clicking:** A sharp "tick" at the start or end of a sound.
*   **Rattling:** When multiple sounds played, they interfered destructively, creating a texture sounding like a broken speaker or a zipper.
*   **"Laser Zap" artifacts:** Pitch envelopes sounded too synthetic and jagged.

## 2. The Root Causes

### Cause A: The "Log of Zero" Mathematical Error
The previous code used `exponentialRampToValueAtTime` to fade volume out.
*   **The Math:** Exponential curves are based on logarithms.
*   **The Bug:** Mathematically, $\log(0)$ is negative infinity. The Web Audio API **cannot** exponentially ramp to exactly `0`.
*   **The Glitch:** If you ramp to a tiny number (e.g., `0.001`) and then immediately call `stop()`, the waveform jumps vertically from 0.001 to 0 instantly. This vertical jump is an infinite frequency impulse, heard as a "Click."

### Cause B: Thread Scheduling Jitter
The previous code scheduled sounds at `ctx.currentTime` (Right Now).
*   **The Reality:** JavaScript runs on the Main Thread. Audio runs on a high-priority Audio Thread.
*   **The Bug:** By the time the Main Thread tells the Audio Thread to "play now," "now" has already passed by a fraction of a millisecond.
*   **The Glitch:** The Audio Thread rushes to catch up, often skipping the very beginning of the attack phase, causing a rough, jagged entry.

### Cause C: Premature Voice Killing
The previous code calculated the exact end of the ramp and called `osc.stop()` at that exact millisecond.
*   **The Bug:** If the browser was under load (calculating physics for 100 balls), the garbage collection or timing might be slightly off. The oscillator might be killed while the gain node was still at `0.01`, causing a "Pop" as the wave was decapitated.

---

## 3. The Solution: Analog Smoothing & Lookahead

We replaced the rigid scheduling and exponential ramps with **Lookahead** and **Asymptotic Decay (`setTargetAtTime`)**.

### Concept 1: The Magic of `setTargetAtTime`
Unlike `rampTo`, which forces a value to be reached at a specific hard time limit, `setTargetAtTime` approaches the target value asymptotically (like a capacitor discharging).

**Why it fixes the rattle:**
1.  It never tries to calculate `log(0)`. It just gets infinitely closer to zero smoothly.
2.  It is "Analog Smooth" by definition. It removes the digital harshness.

### Concept 2: Scheduling Lookahead
We no longer play sounds "Now." We play them "3ms in the future."
```javascript
const t = this.ctx.currentTime + 0.003; // The Lookahead
osc.start(t);
```
This tiny buffer allows the Audio Thread to line up the data perfectly before the speaker actually needs to move, eliminating jitter.

---

## 4. Implementation Comparison

### ❌ The Old Way (Noisy & Brittle)
```javascript
// 1. Triggers instantly (Jitter prone)
const now = ctx.currentTime;

// 2. Hard Ramps (Click prone)
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(1, now + 0.01);
// ERROR: Cannot ramp to 0, so we ramp to 0.001
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); 

// 3. Hard Stop (Pop prone)
// If the ramp isn't 100% finished, this clips the wave
osc.stop(now + 0.1); 
```

### ✅ The New Way (The "Flawless" Fix)
```javascript
// 1. Lookahead (Eliminates Jitter)
// We schedule 5ms into the future
const t = ctx.currentTime + 0.005; 

// 2. SetTarget (Eliminates Math Errors)
// Attack: Linear is fine for percussive starts
gain.gain.setValueAtTime(0, t);
gain.gain.linearRampToValueAtTime(velocity * 0.5, t + 0.005); 

// Decay: The "Silver Bullet"
// Target = 0
// Start Time = t + 0.005
// Time Constant = 0.04 (Controls how fast it fades)
gain.gain.setTargetAtTime(0, t + 0.005, 0.04); 

// 3. Safety Padding (Eliminates Pops)
// We stop the oscillator significantly AFTER the sound is inaudible.
// 0.04 * 6 = ~0.24 seconds. We stop at 0.3s to be safe.
osc.stop(t + 0.3); 
```

## 5. Summary
To fix audio rattling in Web Audio API:
1.  **Don't ramp to zero.** Use `setTargetAtTime` to decay towards zero.
2.  **Don't play at `currentTime`.** Play at `currentTime + 0.005`.
3.  **Don't stop instantly.** Add a "Silence Padding" buffer before killing the oscillator node.
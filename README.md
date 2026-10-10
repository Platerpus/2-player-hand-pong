# CyberPong & CyberFinger — 2-Player AI Hand Tracking Game

An interactive, browser-based computer vision web game where **two hands are tracked simultaneously** in real time, competing in a fast-paced **Air Hockey / Cyber Pong** match!

Each player defends their goal and swats the central glowing physics ball into the opposing net. Faster swings transfer momentum and unleash **Fiery Super Smashes**!

---

## 🎮 How the Game Works

1. **Two Hands Tracked in Real Time**:
   - **Player 1 (Left Goal, Neon Cyan)**: Controls the left side of the screen.
   - **Player 2 (Right Goal, Neon Magenta)**: Controls the right side of the screen.
   - Can be played by **2 players standing side-by-side** facing the camera, or **1 player using both hands**, or **1 player vs the AI Bot**!
2. **The Physics Ball in the Middle**:
   - Starts in the center with a countdown serve towards the conceding player.
   - Bounces off the top and bottom walls with audio feedback.
   - Squeezes, stretches, and leaves dynamic neon comet trails.
3. **Swatting & Momentum Transfer**:
   - Each hand has an active **Swatting Reticle** around the index fingertip and palm.
   - Moving your hand into the ball transfers swing speed directly into ball velocity.
   - **SUPER SMASH ⚡**: Swing your hand fast ($>360\text{ px/s}$) to trigger a golden flame surge, speed boost, screen shake, and heavy smash audio punch!
4. **Goals & Scoreboard**:
   - **Left Goal Mouth**: Player 2 scores here.
   - **Right Goal Mouth**: Player 1 scores here.
   - Top and bottom goal posts bounce the ball back into play.
   - Scoring triggers confetti explosions, goal fanfare sirens, and screen shake!
   - First to **5 points** wins the match!
5. **Solo Mode (1P vs AI Bot)**:
   - Click the **"🤖 Bot: ON"** button on the scoreboard. An intelligent AI opponent defends Player 2's goal and returns your swats!

---

## 🕹️ Controls & Quick Start

### Run Locally:
```bash
python3 -m http.server 8080
```
Open **`http://localhost:8080`** in any modern browser (Chrome, Edge, Safari, Firefox).

* Click **"Enable Camera"** to turn on AI vision hand tracking.
* Or **touch / drag** on the screen to play with fingers or mouse!

---

## 🎨 Additional Sandbox Modes
You can switch modes anytime using the top navigation tabs:
* **🏓 2P Cyber Pong**: The main swatting game.
* **🫧 Physics Orbs**: Multi-bubble physics sandbox where you can bat, fling, and pop floating bubbles.
* **🎨 Air Canvas**: Pinch your thumb and index finger to draw glowing neon artwork in thin air.
* **✨ Stardust Trail**: Real-time particle fireworks and light ribbons following your hands.
* **🎵 Synth Theremin**: Musical instrument modulating pitch and harmonics with your hand movements.

Updated from the user's latest working version.

Main file:
- index.html

---

Changes made:

✅ Scoring system fixed (core logic)
- Categories 1–6:
  - Correct tier scoring applied (5/3/2 or 4/3/2)
  - “Better prediction = 1 point” now applies ONLY when both picks miss scoring range
  - Only one player gets 1 point, other gets 0
  - Tie → 0–0

- Categories 7–15:
  - Now strictly better prediction = 1 point
  - Removed incorrect multi-point logic
  - Tie → 0–0

---

✅ Added missing category
- Added 15th category: Least MVP
- Picks added:
  - Senthil vs Sai → MS Dhoni / Cameron Green
  - Senthil vs Vibeesh → Rajat Patidar / Rishabh Pant

- Rule:
  - Player lower in ESPN MVP list wins
  - Better prediction = 1 point

---

✅ Senthil vs Vibeesh picks corrected
- Fixed incorrect values
- Normalised all names to full format:
  - Abishek → Abhishek Sharma
  - VC → Varun Chakravarthy
  - V. Sooryavanshi → Vaibhav Suryavanshi
  - Sanju → Sanju Samson
  - Ishan → Ishan Kishan
  - Tilak → Tilak Varma
  - Patidar → Rajat Patidar
  - Pant → Rishabh Pant

- Ensured consistent naming across entire app

---

🎨 UI Improvements
- Restored colourful war-room design
- Improved contrast and visual hierarchy
- Dark theme with gradients and glow effects

---

😈 Roast Corner update
- Removed system/update messages
- Now pure banter only
- Context-aware based on current leader

---

🔄 Data handling improvements
- IPL 2026 only parsing
- Improved fallback handling
- Next match card fixed (no blank/TBC)

---

Use:

1. Replace your repo root file with:
   index.html

2. Commit and push to your branch

3. Merge PR

4. Hard refresh:
   Ctrl + Shift + R

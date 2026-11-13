# AI prompt for making a note page

(In the app: Editor → "AI prompt" copies this prompt plus the template. Then paste your notes at the end.)

```
Make ONE self-contained HTML file from MY NOTES below, using the TEMPLATE exactly (keep every ===== marker comment).
- Theme: Nothing OS (pure black, white text, red #d71921 accent, Doto dot headings, Space Mono labels, no emoji).
- Use ONLY my notes; no outside facts. Short bullets, tables where useful.
- Notes: one <section class="note"> per concept.
- MCQs: 15-25, one per line in MCQS: {id,q,o:[4],a:0-3,e:short}. Unique permanent ids (q1, q2...). Mix recall, application, traps.
- Keep NP.record() tracking from the engine; no localStorage.
- Output code only.
```

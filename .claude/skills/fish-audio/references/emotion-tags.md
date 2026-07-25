# Inline direction & emotion tags

Fish Audio lets you steer *delivery* — emotion, tone, pacing, non-speech sounds
— by embedding tags **directly in the `text`** you send. There is no separate
parameter: the tags travel with the text and apply from that point (or to the
word/phrase they precede). The syntax depends on the model.

## S2 / S2-Pro — `[square brackets]`, free-form

The default `s2-pro` (and `s2`) models take **square-bracket** tags written in
plain natural language. There is no fixed vocabulary — the model interprets
whatever you describe, from a single word to a full clause. Fish advertises
15,000+ recognized descriptions, so "just write what you mean."

```
[chuckle] When you're creating something new, there's this [emphasis]
beautiful mix of wonder and fear. [whispering] But you keep going.
[laughing nervously while trying to keep composure] Every single time.
```

Examples of bracket directions: `[laughs]`, `[chuckle]`, `[emphasis]`,
`[whispering]`, `[shouting]`, `[excited]`, `[sarcastic]`, `[sighs]`,
`[speaking slowly]`, `[warm and reassuring]`.

### Paralanguage cues — `(parentheses)` with S2

For precise non-speech sounds and pauses, S2 also accepts a small set of
**parenthesized** cues:

| Cue            | Effect              |
| -------------- | ------------------- |
| `(break)`      | short pause         |
| `(long-break)` | extended pause      |
| `(breath)`     | audible inhale      |
| `(laugh)`      | inline laugh sound  |
| `(cough)`      | cough sound         |
| `(sigh)`       | sigh sound          |
| `(lip-smacking)` | lip-smacking sound |

```
Let me think about that (break) yeah, I agree. (sigh) It's been a long day.
```

## S1 — `(parentheses)`, fixed marker set

The `s1` / `s1-mini` models use **parenthesized** markers from a defined set
(not free-form). Place the marker before the span it should color.

**Emotion:** `(angry)` `(sad)` `(disdainful)` `(excited)` `(surprised)`
`(satisfied)` `(unhappy)` `(anxious)` `(hysterical)` `(delighted)` `(scared)`
`(worried)` `(indifferent)` `(upset)` `(impatient)` `(nervous)` `(guilty)`
`(scornful)` `(frustrated)` `(depressed)` `(panicked)` `(furious)`
`(empathetic)` `(embarrassed)` `(reluctant)` `(disgusted)` `(keen)` `(moved)`
`(proud)` `(relaxed)` `(grateful)` `(confident)` `(interested)` `(curious)`
`(confused)` `(joyful)` `(disapproving)` `(negative)` `(denying)`
`(astonished)` `(serious)` `(sarcastic)` `(conciliative)` `(comforting)`
`(sincere)` `(sneering)` `(hesitating)` `(yielding)` `(painful)` `(awkward)`
`(amused)`

**Tone:** `(in a hurry tone)` `(shouting)` `(screaming)` `(whispering)`
`(soft tone)`

**Special / non-speech:** `(laughing)` `(chuckling)` `(sobbing)`
`(crying loudly)` `(sighing)` `(panting)` `(groaning)` `(crowd laughing)`
`(background laughter)` `(audience laughing)`

```
(excited) We did it! (laughing) I can't believe it actually worked.
```

## Choosing a model for tags

- **Want the flexible bracket syntax from the user's example** (`[chuckle]`,
  `[emphasis]`, natural-language directions) → use `s2-pro` (the default) or
  `s2`. This is the recommended path for new work.
- **Working with S1** → use the fixed parenthesized markers above; bracket
  tags won't behave the same way.

Mixing the wrong syntax with a model generally just gets the tag read aloud or
ignored, so match the syntax to the model.

## Notes

- Tags work the same whether you call the REST API, the SDK, or WebSocket
  streaming — they're just part of the `text` string.
- Keep tags sparse and purposeful; over-tagging can make delivery erratic.
- The marker sets evolve. For the current authoritative list, see
  https://docs.fish.audio/developer-guide/core-features/emotions.

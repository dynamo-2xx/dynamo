# Debate happy-path smoke test

Run before every release. ~10 minutes per platform. A green run = ship.

## Platforms

Minimum coverage:

- Desktop Chrome (host)
- Desktop Safari (invited speaker)
- iOS Safari (invited speaker, mic)
- Android Chrome (audience)

Use two distinct Lovable accounts; a third tab as anonymous audience.

## Checklist

1. **Create**
   - [ ] `/create` → pick prompt template → debate appears as draft
   - [ ] Invite a speaker via the invite panel → invitee email/link arrives

2. **Lobby**
   - [ ] Invitee opens link → lands in **mic prep lobby** (not blank room)
   - [ ] Host sees invitee appear with mic status indicator
   - [ ] Both sides see each other ready

3. **Launch**
   - [ ] Host clicks Launch → both clients transition to live within 2s
   - [ ] First speaker mic auto-enables, second speaker mic gated

4. **Turn flow**
   - [ ] Speaker speaks → transcript streams live on both clients
   - [ ] Turn timer counts down; freezes during speaker pause
   - [ ] Speaker-pause: any client can resume; 30s auto-resume fires if abandoned
   - [ ] End-turn-early advances both clients to prep phase

5. **Prep phase**
   - [ ] Both sides see prep overlay with AI argument bubbles
   - [ ] Inline edit on a bubble → "edited" chip persists; revert restores AI original
   - [ ] Both sides marking ready advances the debate

6. **AI threading**
   - [ ] Threaded record groups quote/stake/evidence under their parent claim (not as siblings)
   - [ ] Argument chips render with the correct color (claim/argument/counter/etc.)
   - [ ] No duplicate-title threads inside one subtopic

7. **Host failover** (Wave 6 §2)
   - [ ] Close host tab. Within 90s, another speaker sees "Host appears offline — Take control"
   - [ ] Clicking Take control transfers host duties; banner clears for all

8. **Completion**
   - [ ] Final turn completes → completion overlay shows on all clients
   - [ ] Record header shows Public/Private toggle for creator only; toggle persists across reload
   - [ ] Audience/projector links render the read-only record
   - [ ] Record Q&A returns answers with citation hotlinks

9. **Comments + notebook**
   - [ ] Comment thread is reachable on the completed record
   - [ ] Notebook overlay opens from the floating button and saves content

## Failure logging

Open an issue tagged `release-blocker` per failed item. Attach:

- platform + browser version
- debate id (URL)
- console + network HAR if available
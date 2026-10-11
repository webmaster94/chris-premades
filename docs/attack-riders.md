# Divine Smite and Sneak Attack

CPR runs these features after an attack's damage roll completes. The feature must have CPR automation attached. Merely naming an imported item Divine Smite or Sneak Attack does not attach automation.

## Fixed failure cases

- CPR listened for damage and completion events from the older Midi fork. Standard Midi-QOL 14.6 emits different events. CPR now binds the relevant native events before checking feature eligibility.
- An NPC's 2024 Sneak Attack lacked a class-style use counter. CPR previously treated the missing counter as zero remaining uses. Unlimited NPC features now work, while actual limited resources still block an exhausted feature.
- An NPC had damage configured on its Sneak Attack feature, but CPR guessed damage from challenge rating instead. CPR now uses its configured formula, class scale, or Damage activity before the existing CR fallback. CR zero without damage data produces an explanation instead of zero dice.
- Several targets were selected, but only one was hit. CPR checked the first selected target, which could be a miss. It now checks adjacency, creature type, and follow-up targets against the actual hit target.
- A character's 2024 Sneak Attack damage scale was missing. CPR spent the use before discovering that it could not calculate damage. It now validates damage first.
- The attack roll recorded advantage or disadvantage separately from the workflow flags. CPR now prefers the completed roll's options.
- The damage hook repeated. CPR now tracks the applied feature on that attack and guards pending prompts and repeated applications. Sneak Attack also tracks its use on the current combat turn for NPC features without a use counter.
- An NPC's Smite was a feature with its own Damage activity instead of a class spell-slot spender. Its configured statblock damage and limited uses are now supported.
- A 2024 Smite utility could spend its slot without delivering a completed damage workflow back to CPR. Divine Smite now selects its resource directly, supports granted free casts separately, and adds the damage without awaiting that empty utility workflow.

## Manual fallback

Select one target and use the Divine Smite or Sneak Attack item itself. New CPR items label their utility activity **Manual Damage**. Existing CPR items with only actor macro bindings also reach this fallback; the active GM's client adds a utility activity to bound features that have no activities.

CPR asks you to confirm that the attack qualified and that the extra damage has not already been included. It rolls only the extra damage against the selected target. It does not repeat the weapon attack or its base damage.

For two minutes after CPR sees a hit, the fallback can reuse that hit's target, critical status, and weapon damage type. It refuses a hit to which CPR already added the feature. Without a matching recent hit, it asks whether the hit was critical and uses the feature's configured damage type, or asks you to choose one. Critical damage follows the world's configured critical rules. You must check damage that another automation or a weapon's own damage formula already included.

Smite consumes the selected spell slot, or the configured NPC feature use. The 2024 spell still requires an available bonus action on the caster's turn. Sneak Attack consumes a configured use in combat and remains limited to once per turn. Cancelling the confirmation or slot selection consumes nothing.

## Expected skips and setup

Automatic use still skips a miss, an attack with more than one hit target, or an ineligible weapon. Sneak Attack requires a ranged weapon or finesse weapon, plus advantage or an eligible adjacent enemy of the target. Disadvantage prevents the usual adjacency trigger. The legacy Swashbuckler and Inquisitive alternatives remain supported. A missing finesse property on an imported NPC attack can prevent automatic recognition; correct the attack's properties or use the manual confirmation for a hit you know qualifies.

For an NPC with a specific Sneak Attack value, set **Formula** in the CPR item configuration or retain a **Damage** activity on the feature. Prefer its statblock damage to the CR fallback. Class-style Smite needs spell slots; a statblock-specific Smite needs its own damage data. Unprepared or exhausted spells, an unavailable bonus action, and off-turn use of the 2024 Smite spell remain unavailable.

D&D 6 requires the [Midi-QOL 14.6.x release line](https://foundryvtt.com/packages/midi-qol/), with DAE 14.6.x and Foundry 14.368 or later. Midi-QOL 14.0.x belongs to the D&D 5.x line and cannot provide reliable D&D 6 workflows.

## Verification

The regression suite exercises the actual CPR macro callbacks for the failure cases above, manual critical damage, cancellation, exhausted resources, and duplicate prevention. Local Foundry runtime results are recorded in the release changelog after testing.

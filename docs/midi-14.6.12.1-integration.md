# Midi 14.6.12.1 integration check

Checked against [Midi QOL Enhanced commit 2cfb8125](https://github.com/webmaster94/midi-qol-enhanced/commit/2cfb8125) and its published 14.6.12.1 manifest on 2026-11-14. The complete upstream 14.6.12 commit 3711a1b9 is an ancestor, so the upstream source history was retained. The module ID remains `midi-qol`; its D&D range includes 6.1.0.

## Fixed in CPR and GPS

- CPR synthetic result checks now use explicit document counts even when the variable is named `saveWorkflow`, `featureWorkflow`, or similar. The earlier sweep covered only variables named `workflow`. Actor-only lookups use documents; animation/movement lookups use tokens.
- CPR accepts Midi's TokenDocument in the target-damage hook. It preserves the exact target actor for off-canvas damage callbacks and resolves an existing canvas token for spatial callbacks.
- CPR target removal retains off-canvas documents. Remote roll requests now spell Midi's `checkGMstatus` option correctly.
- GPS calls `checkActivityRange`. `MidiQOL.checkRange` is no longer exported; it affected Riposte, Instinctive Charm, Confusion, and Calculated Flourish weapon selection.
- GPS save reactions replace display rows by document UUID in either token mode and keep off-canvas targets in outcome checks. Its `gpsActivityUse` result deliberately retains its own small `{failedSaves: {size}}` response contract; that is not a Midi TokenDocumentSet.

The CPR and GPS named Midi API calls were compared with the exports in the updated fork. The hooks used by CPR/GPS still exist, with the expected workflow payloads. Representative tests cover returned-save counts, document-mode damage hooks, and save-result replacement. This is a bounded source/API check, not a full in-game automation playthrough.

## Send to the Midi agent

These are reproducible source-level findings in 14.6.12.1. Midi was left unchanged.

1. **Self-targeted triggered OverTime is dropped after an attack/save.** In [Workflow.ts, runTriggeredActivity](https://github.com/webmaster94/midi-qol-enhanced/blob/2cfb8125/src/module/Workflow.ts#L3694), `targetUuids` for `triggeredActivityTargets: "self"` contains the caster, but `allowedTargetUuids` contains hit/failed-save recipients. The filter at line 3729 removes the caster even when the attack hit and the enemy failed its save. The same problem applies when `ignoreTriggeringActivitySaveHit` is false and the effect is intended for the caster after a successful attack. Reproducing the actual method with one hit/failed-save target gives one controller for `targets` and zero for `self`. Check eligibility against the triggering hit/save results separately from choosing the controller recipient. Include self, retarget, and first-target modes in a regression for this branch.

2. **Macro scope ignores the supplied target token.** In [Workflow.ts, executeMacroWithScope](https://github.com/webmaster94/midi-qol-enhanced/blob/2cfb8125/src/module/Workflow.ts#L5104), `triggerTargetMacros` passes the exact target as `options.token`, but scope construction uses `tokenForActor(actorToUse)` instead. With two linked tokens for one actor, a hit against the second can run its macro as the first. Executing the actual scope method with `options.token` set to the hit token reproduces the mismatch. Prefer the supplied token, resolving its existing placeable only if the macro contract requires one. Avoid substituting a different token for an undrawn target. This behavior is inherited from upstream rather than introduced by the fork merge, but matters to GPS target reactions.

The local reproduction script is `Development/cache/audit-midi-integration.cjs`. It extracts and transpiles the two methods directly from the checked-out Midi source. No Midi files were edited and no message was sent to the other agent.

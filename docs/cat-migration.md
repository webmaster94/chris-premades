# CAT integration

CPR 2.1.0 requires Coven's Automation Toolkit 0.1.1, Foundry 14.368 or later, D&D 6.0.x, Midi-QOL 14.6.0, and DAE 14.6.0.

CAT lists CPR's existing compendiums and renders their configuration and shared dialogs. The existing CPR functions and event bindings remain in use. They are not registered a second time as CAT event handlers. The public `chrisPremades` API remains available to world macros.

The active GM migrates world items, actor items, embedded effects and activities, and unlinked tokens on every scene. The first migration also visits unlocked world Item and Actor compendiums. Locked compendiums remain read-only; imported items are migrated when created. Run `await chrisPremades.cat.migrate()` to retry a migration or include compendiums again. The result lists changed documents, failures, and locked packs. Failures are logged with document UUIDs and retried on the next startup.

Stored configuration is copied to `flags.cat.config`; generic configuration is namespaced under `flags.cat.genericConfig.chris-premades`. Existing CAT values take precedence, including false, zero, empty strings, null, and arrays. The initial legacy configuration is retained in `flags.chris-premades.catMigration.config`. Legacy flags and automation bindings remain available. CAT edits are mirrored for older functions that read the original configuration directly. Re-running the migration does not replace CAT choices with older values.

CAT configuration panels retain source preferences already set by the GM. On first use CPR is enabled as a source ahead of GPS and the sample Midi-QOL items. A GM can change that order in CAT.

Teleport placement uses CAT's region crosshairs with a separate contrasting destination ring. The range boundary is on the canvas controls layer. A small prompt sits above the hotbar. Clicking confirms the clicked position, including without a prior mouse move; an invalid destination remains open and turns red. Escape or the cancel control closes the picker. These markers work with spell animations disabled.

Validation used Foundry 14.369, D&D 6.0.6, CAT 0.1.1, Midi-QOL 14.6.0, and DAE 14.6.0. Checks cover saved settings, CAT configuration edits on an unlinked NPC, GPS reaction form results and pause controls, teleport selection and cancellation, Dimension Door moving two tokens, and automatic NPC Sneak Attack without duplicate damage. The regression suite also checks every shipped CPR item macro binding. These checks do not play through every individual spell or class feature.

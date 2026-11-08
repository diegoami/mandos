# Pinned headless host protocol

intent-gate.ts is byte-identical to neostryder/neo-angband commit
97ceec2925e6715ba725624a61866ab93a196a12, packages/web/src/intent-gate.ts
(the published Core/SDK/content beta.3 source). Original copyright/licensing
and comments remain; the repository GPL-2.0-only licence applies. The sole
local companion input-snapshot.ts is an erased type interface for phase/prompt.
No browser, desktop, Worker or origin registration is created.

The measurement shim uses this same gate configuration as that commit's
packages/web/src/mod-api2-shim.ts controller: queue/storeCommand plus current
input token, with target IDs translated by the host before submission. Core's
registered shop transaction commands are used; no native modal is rendered.

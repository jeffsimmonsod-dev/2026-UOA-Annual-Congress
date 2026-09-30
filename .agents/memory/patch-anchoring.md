---
name: Patch anchoring in route files
description: Avoid accidental multi-handler changes when patching a large route module with repeated SQL and control flow.
---

Use a unique route or function anchor and verify the resulting diff against the base revision before completion when editing a large route module.

**Why:** A patch built around common SQL or closing braces applied across several unrelated handlers, leaving the module syntactically valid but breaking existing endpoints. A local typecheck made before completion did not catch the later committed state.

**How to apply:** After patching repeated route patterns, compare the complete affected file against its base revision and check the route registration list, not just the new code or a running server built from an earlier revision.
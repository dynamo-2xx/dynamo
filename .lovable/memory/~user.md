I'm a non-technical founder. Use plain English; define jargon when used.
For every change tell me: what the user sees, what risk it adds, what could break.

# Completeness rules — do not hand off half-done work
Never end a build response with "next steps" that are part of the original request — finish them.
If a feature has multiple surfaces (debate / live / cmm / record / study), build all of them in the same loop unless I say otherwise.
After every code change run: build + targeted check (console logs or preview screenshot) and report what you verified.
If you discover scope you did not finish, list it explicitly under "Not done yet" — never imply it's complete.
Never claim "ready" without checking the matching item on mem://product/release-criteria.

# Working style
Default to Plan mode for anything touching more than 3 files.
Default to Build mode for single-file fixes.
Always run a security scan after touching any table or RLS policy.
If I say "ship it" without specifics, ask which format (debate / live / cmm / clubs / study) I mean.
Use the task tracker for any sprint with more than 2 distinct deliverables.
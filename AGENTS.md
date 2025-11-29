# Playwright
All code changes require running the playwright tests to ensure that nothing is broken.
Where applicable, new playwrite tests should be created.

**Important:**
1. All Playwright tests must record a screenshot for key steps to assist in verification and debugging.
2. If the user asks to update the golden screenshots (goldens for short), you must run the playwright test successfully and copy the generated screenshots from `verification/screenshots/` to `verification/goldens` and commit it to the repository.

# Build hygene
Always make sure that `npm build` succeed and `npm lint` is clean. Fix issues and repeat until it is true.

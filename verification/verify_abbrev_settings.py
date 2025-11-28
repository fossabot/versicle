
import asyncio
import re
from playwright.async_api import async_playwright, expect

async def verify_abbrev_settings():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Navigate to the app (assuming default vite port 5173)
        await page.goto("http://localhost:5173")

        # Ingest a book to reach the reader view
        file_input = page.locator('input[type="file"]')
        if await file_input.count() > 0:
            await file_input.set_input_files('src/test/fixtures/alice.epub')

            # Wait for book to appear in library
            await expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible(timeout=10000)

            # Click the book to navigate to reader
            await page.get_by_text("Alice's Adventures in Wonderland").click()

            # Wait for navigation to reader
            await expect(page).to_have_url(re.compile(r".*/read/.*"), timeout=10000)
        else:
            print("Could not find file input for ingestion.")

        # Once in Reader view

        # 1. Open TTS Panel
        print("Opening TTS Panel...")
        await page.get_by_label("Text to Speech").click()

        # 2. Open Voice Settings (inside TTS Panel)
        print("Opening Voice Settings...")
        await page.get_by_label("Voice Settings").click()

        # 3. Verify TTS/Abbreviation settings are visible.
        await expect(page.get_by_text("Sentence Segmentation")).to_be_visible(timeout=5000)

        # Check for Export/Import buttons
        await expect(page.locator("button[title='Download CSV']")).to_be_visible()
        await expect(page.locator("button[title='Upload CSV']")).to_be_visible()

        # Take screenshot of the settings panel
        await page.screenshot(path="verification/abbrev_settings.png")
        print("Screenshot taken.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_abbrev_settings())

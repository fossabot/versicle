import asyncio
import re
from playwright.async_api import async_playwright, expect
import utils

async def run_test():
    async with async_playwright() as p:
        browser, context, page = await utils.setup(p)

        print("Starting Library Journey...")
        await utils.reset_app(page)

        # 1. Verify Empty Library
        # Initially, there should be no books.
        # Note: The UI might show "Drag & drop" message or just empty grid.
        await utils.capture_screenshot(page, "library_1_empty")

        # 2. Upload Book
        print("Uploading book...")
        file_input = page.locator("input[type='file']")
        await file_input.set_input_files("src/test/fixtures/alice.epub")

        # Verify book appears
        await expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible(timeout=10000)
        await utils.capture_screenshot(page, "library_2_with_book")

        # 3. Persistence Check
        print("Reloading to check persistence...")
        await page.reload()
        await expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible(timeout=5000)
        await utils.capture_screenshot(page, "library_3_persistence")

        # 4. Navigation Check (Clicking book)
        print("Clicking book to verify navigation...")
        await page.get_by_text("Alice's Adventures in Wonderland").click()
        await expect(page).to_have_url(re.compile(r".*/read/.*"), timeout=5000)

        # Verify we are in reader view (Back button exists)
        await expect(page.get_by_label("Back")).to_be_visible()
        await utils.capture_screenshot(page, "library_4_navigation")

        print("Library Journey Passed!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())

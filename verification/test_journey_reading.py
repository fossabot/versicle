import asyncio
import re
from playwright.async_api import async_playwright, expect
import utils

async def run_test():
    async with async_playwright() as p:
        browser, context, page = await utils.setup(p)

        print("Starting Reading Journey...")
        await utils.reset_app(page)
        await utils.ensure_library_with_book(page)

        # Open Book
        print("Opening book...")
        await page.get_by_text("Alice's Adventures in Wonderland").click()
        await expect(page).to_have_url(re.compile(r".*/read/.*"))
        await expect(page.get_by_label("Back")).to_be_visible()

        # Wait for content to render (iframe logic is tricky, but usually checking for text is enough)
        # Using a fixed wait for initial render stability is sometimes necessary with epub.js
        await page.wait_for_timeout(2000)
        await utils.capture_screenshot(page, "reading_1_initial")

        # 1. Navigation (Next/Prev)
        print("Testing Next/Prev...")
        next_btn = page.get_by_label("Next Page")
        await next_btn.click()
        await page.wait_for_timeout(1000) # Wait for transition
        await utils.capture_screenshot(page, "reading_2_next_page")

        prev_btn = page.get_by_label("Previous Page")
        await prev_btn.click()
        await page.wait_for_timeout(1000)
        await utils.capture_screenshot(page, "reading_3_prev_page")

        # 2. TOC
        print("Testing TOC...")
        toc_btn = page.get_by_label("Table of Contents")
        await toc_btn.click()
        await expect(page.get_by_role("heading", name="Contents")).to_be_visible()
        await utils.capture_screenshot(page, "reading_4_toc_open")

        # Click a chapter (e.g., 2nd item)
        toc_item = page.locator("ul.space-y-2 li button").nth(1)
        await toc_item.click()

        # TOC should close automatically
        await expect(page.get_by_role("heading", name="Contents")).not_to_be_visible()
        await page.wait_for_timeout(1000)
        await utils.capture_screenshot(page, "reading_5_after_toc")

        # 3. Keyboard Shortcuts
        print("Testing Keyboard Shortcuts...")
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(500)
        await utils.capture_screenshot(page, "reading_6_keyboard_right")

        await page.keyboard.press("ArrowLeft")
        await page.wait_for_timeout(500)
        await utils.capture_screenshot(page, "reading_7_keyboard_left")

        print("Reading Journey Passed!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())

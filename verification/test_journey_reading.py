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

        # Wait for content to render
        await page.wait_for_timeout(3000)
        await utils.capture_screenshot(page, "reading_01_initial_cover")

        # Helper to get current text content (for verification)
        async def get_frame_text():
             frame = page.frame_locator("iframe").first
             # We need to wait for body
             try:
                 await frame.locator("body").wait_for(timeout=2000)
                 text = await frame.locator("body").inner_text()
                 return text[:100].replace('\n', ' ') # Return start of text
             except:
                 return "Frame/Body not ready"

        initial_text = await get_frame_text()
        print(f"Initial Text: {initial_text}")

        # 1. Navigation (Next Page 1)
        print("Testing Next Page (1)...")
        next_btn = page.get_by_label("Next Page")
        await next_btn.click()
        await page.wait_for_timeout(3000)
        text_1 = await get_frame_text()
        print(f"Page 1 Text: {text_1}")
        await utils.capture_screenshot(page, "reading_02_page_1")

        if text_1 == initial_text:
            print("WARNING: Content did not change after first navigation!")

        # Next Page 2
        print("Testing Next Page (2)...")
        await next_btn.click()
        await page.wait_for_timeout(3000)
        text_2 = await get_frame_text()
        print(f"Page 2 Text: {text_2}")
        await utils.capture_screenshot(page, "reading_03_page_2")

        if text_2 == text_1:
             print("WARNING: Content did not change after second navigation!")

        # Next Page 3
        print("Testing Next Page (3)...")
        await next_btn.click()
        await page.wait_for_timeout(3000)
        text_3 = await get_frame_text()
        print(f"Page 3 Text: {text_3}")
        await utils.capture_screenshot(page, "reading_04_page_3")

        # Verify we navigated
        if text_3 == initial_text:
             raise Exception("Navigation failed: Content remains same as cover.")

        # Prev Page
        print("Testing Prev Page...")
        prev_btn = page.get_by_label("Previous Page")
        await prev_btn.click()
        await page.wait_for_timeout(3000)
        text_prev = await get_frame_text()
        print(f"Prev Page Text: {text_prev}")
        await utils.capture_screenshot(page, "reading_05_prev_page")

        # 2. TOC
        print("Testing TOC...")
        toc_btn = page.get_by_label("Table of Contents")
        await toc_btn.click()
        await expect(page.get_by_role("heading", name="Contents")).to_be_visible()
        await utils.capture_screenshot(page, "reading_06_toc_open")

        # Click a chapter (e.g., 2nd item - likely 'Down the Rabbit-Hole')
        toc_item = page.locator("ul.space-y-2 li button").nth(1)
        toc_text = await toc_item.inner_text()
        print(f"Clicking TOC item: {toc_text}")
        await toc_item.click()

        # TOC should close automatically
        await expect(page.get_by_role("heading", name="Contents")).not_to_be_visible()
        await page.wait_for_timeout(3000)

        text_toc_nav = await get_frame_text()
        print(f"After TOC Nav Text: {text_toc_nav}")
        await utils.capture_screenshot(page, "reading_07_after_toc")

        # 3. Keyboard Shortcuts
        print("Testing Keyboard Shortcuts...")
        # Focus iframe or body to ensure keys are caught?
        # Usually body handles it.
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(1000)
        await utils.capture_screenshot(page, "reading_08_keyboard_right")

        text_key = await get_frame_text()
        print(f"After Key Right Text: {text_key}")

        print("Reading Journey Passed!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())

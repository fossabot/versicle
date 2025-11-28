import asyncio
import re
from playwright.async_api import async_playwright, expect
import utils

async def run_test():
    async with async_playwright() as p:
        browser, context, page = await utils.setup(p)

        print("Starting Settings Journey...")
        await utils.reset_app(page)
        await utils.ensure_library_with_book(page)

        # Open Book
        await page.get_by_text("Alice's Adventures in Wonderland").click()
        await expect(page.get_by_label("Back")).to_be_visible()
        await page.wait_for_timeout(2000)

        # 1. Open Settings
        print("Opening Settings...")
        settings_btn = page.get_by_label("Settings")
        await settings_btn.click()
        await expect(page.get_by_text("Font Size")).to_be_visible()
        await utils.capture_screenshot(page, "settings_1_open")

        # 2. Change Theme (Sepia)
        print("Changing Theme...")
        theme_section = page.locator("div", has_text="Theme")
        # Sepia is typically the 3rd button (Light, Dark, Sepia)
        sepia_btn = theme_section.locator("button").nth(2)
        await sepia_btn.click()

        # Verify theme change (screenshot check)
        await page.wait_for_timeout(500)
        await utils.capture_screenshot(page, "settings_2_sepia")

        # Re-open settings if closed (theme change triggers re-render)
        if not await page.get_by_text("Font Size").is_visible():
            await settings_btn.click()
            await expect(page.get_by_text("Font Size")).to_be_visible()

        # 3. Change Font Size
        print("Changing Font Size...")
        font_size_section = page.locator("div", has_text="Font Size")
        increase_font_btn = font_size_section.locator("button", has_text="+")

        await increase_font_btn.click()
        await expect(page.get_by_text("110%")).to_be_visible()
        await utils.capture_screenshot(page, "settings_3_font_increased")

        # 4. Persistence
        print("Reloading to check persistence...")
        await page.reload()
        await expect(page.get_by_label("Back")).to_be_visible(timeout=15000)
        await page.wait_for_timeout(2000)

        # Check if still sepia (visually in screenshot) and font size persisted?
        # To check font size, we need to open settings
        await settings_btn.click()
        await expect(page.get_by_text("110%")).to_be_visible()

        await utils.capture_screenshot(page, "settings_4_persistence")

        print("Settings Journey Passed!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())

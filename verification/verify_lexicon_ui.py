
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the app
        await page.goto("http://localhost:5173")

        # Wait for the page title to be Versicle
        await expect(page).to_have_title("Versicle")

        # Wait for the settings button
        settings_btn = page.locator('[data-testid="header-settings-button"]')

        # Sometimes header loads later, let's wait a bit
        await settings_btn.wait_for(state='visible')

        await settings_btn.click()

        # Wait for settings dialog
        await expect(page.get_by_role("dialog")).to_be_visible()

        # Click "Dictionary" tab (in Sidebar) - The text is "Dictionary"
        await page.get_by_role("button", name="Dictionary").click()

        # Click "Manage Rules" button
        await page.get_by_role("button", name="Manage Rules").click()

        # Wait for Lexicon Manager dialog
        await expect(page.get_by_role("dialog", name="Pronunciation Lexicon")).to_be_visible()

        # Take a screenshot of the Lexicon Manager
        await page.screenshot(path="verification/lexicon_manager.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

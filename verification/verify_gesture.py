
import os
import sys
from playwright.sync_api import sync_playwright, expect

def verify_gesture_overlay():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"]
        )
        page = browser.new_page()

        # Navigate to home
        page.goto("http://localhost:5173/")
        page.wait_for_load_state("networkidle")

        # Check if library is empty and load demo book if needed
        if page.get_by_text("Your library is empty").is_visible():
            print("Library empty. Loading demo book...")
            page.click("text=Load Demo Book (Alice in Wonderland)")
            page.wait_for_timeout(2000) # Wait for ingestion

        print("Opening book...")
        page.click("text=Alice's Adventures in Wonderland")

        # Wait for reader to load
        page.wait_for_selector("div[data-testid='reader-iframe-container']", timeout=10000)
        page.wait_for_timeout(2000)

        # Open Settings
        print("Opening settings...")
        page.click("button[data-testid='reader-settings-button']")
        page.wait_for_timeout(500)

        # Toggle Gesture Mode
        print("Toggling gesture mode...")
        # Force click because the input is obscured by the styled div
        page.click("input[type='checkbox']", force=True)
        page.wait_for_timeout(500)

        # Close Settings
        print("Closing settings...")
        # If the gesture overlay appeared immediately (which it does based on state change), it might cover the close button?
        # GestureOverlay has z-50. ReaderSettings has z-30.
        # Yes, GestureOverlay covers the screen immediately upon toggle!
        # So we cannot click the close button of settings.
        # But GestureOverlay has an "Exit Gesture Mode" button.
        # Actually, if I just enabled it, I expect to be in gesture mode.
        # So checking if "Gesture Mode Active" is visible confirms it worked.

        # Verify Overlay is active (check text)
        expect(page.locator("text=Gesture Mode Active")).to_be_visible()

        # Trigger a tap (Center) to play/pause
        print("Testing gesture tap...")
        page.mouse.click(500, 300)
        page.wait_for_timeout(500)

        # Take screenshot
        page.screenshot(path="verification/gesture_mode_active.png")
        print("Screenshot saved to verification/gesture_mode_active.png")

        browser.close()

if __name__ == "__main__":
    verify_gesture_overlay()

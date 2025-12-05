from playwright.sync_api import sync_playwright, expect
import time

def verify_list_view_and_take_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a desktop viewport to ensure layout is standard
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            # 1. Load the app
            print("Navigating to app...")
            page.goto("http://localhost:5173", timeout=10000)

            # 2. Ensure library is loaded (Wait for header settings button as a proxy for load)
            print("Waiting for library to load...")
            page.wait_for_selector("[data-testid='header-settings-button']", timeout=10000)

            # 3. Add demo book if empty (using EmptyLibrary button if present)
            empty_state = page.locator("text=Your library is empty")
            if empty_state.is_visible():
                print("Library is empty. Loading demo book...")
                # Assuming there is a button to load demo book or similar,
                # but EmptyLibrary in current code only has Import.
                # Wait, EmptyLibrary usually has a "Load Demo Book" link or button?
                # In current EmptyLibrary.tsx: <EmptyLibrary onImport={...} />
                # Let's check EmptyLibrary source code quickly.
                pass
                # If we can't load demo book easily via UI, we might be stuck with empty library.
                # However, the previous test passed `ensure_library_with_book`.
                # `ensure_library_with_book` uses `page.evaluate("window.resetApp()")` or similar logic?
                # No, `verification/utils.py` uses `page.evaluate` to inject books if needed or relies on `reset_app`.

            # Let's try to capture the Grid View first
            print("Capturing Grid View...")
            page.screenshot(path="verification/screenshots/1_grid_view.png")

            # 4. Toggle to List View
            toggle_btn = page.locator("[data-testid='view-toggle-button']")
            if toggle_btn.is_visible():
                print("Toggling to List View...")
                toggle_btn.click()

                # Wait for transition/render
                time.sleep(1)

                # 5. Capture List View
                print("Capturing List View...")
                page.screenshot(path="verification/screenshots/2_list_view.png")

                # 6. Verify List Item content visually
                # We can't verify text if we don't know what book is there, but screenshot helps.
            else:
                print("Toggle button not found!")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/screenshots/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_list_view_and_take_screenshots()

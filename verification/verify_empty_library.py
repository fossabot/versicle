from playwright.sync_api import sync_playwright

def verify_empty_library():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # Navigate to the app
            page.goto("http://localhost:5173/")

            # Wait for the "Your library is empty" text
            page.wait_for_selector("text=Your library is empty", timeout=10000)

            # Wait for the new icon to appear (Library icon is an svg)
            # We can check for the BookOpen icon in the button too

            # Take a screenshot of the empty state
            page.screenshot(path="verification/empty_library.png")
            print("Screenshot taken: verification/empty_library.png")

        except Exception as e:
            print(f"Error: {e}")
            # Take a screenshot on error too
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_empty_library()

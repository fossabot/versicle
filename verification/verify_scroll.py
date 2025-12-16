from playwright.sync_api import Page, expect, sync_playwright
import time

def test_scroll_behavior(page: Page):
    print("Navigating to http://localhost:5173")
    page.goto("http://localhost:5173")

    time.sleep(2)

    load_demo_btn = page.get_by_role("button", name="Load Demo Book")
    if load_demo_btn.is_visible():
        print("Loading demo book...")
        load_demo_btn.click()
        time.sleep(3)

    print("Clicking first book card...")
    try:
        page.locator(".book-card").first.click()
    except:
        page.get_by_text("Alice's Adventures in Wonderland").click()

    print("Waiting for reader...")
    try:
        page.wait_for_selector('[data-testid="reader-view"]', timeout=15000)
    except:
        print("Reader view not found.")
        return

    time.sleep(3)

    # Switch to Scroll Mode
    print("Switching to Scroll Mode...")
    try:
        page.get_by_test_id("reader-visual-settings-button").click()
        time.sleep(0.5)
        page.get_by_text("Scroll").click()
        # Close popover (click top left)
        page.mouse.click(10, 10)
        time.sleep(2)
    except Exception as e:
        print(f"Failed to switch mode: {e}")

    # Next Chapter
    print("Navigating to next chapter...")
    page.keyboard.press("ArrowRight")
    time.sleep(3) # Wait for chapter load

    # Check for HUD/Pill
    print("Waiting for Pill...")
    try:
        page.wait_for_selector('[data-testid="compass-pill-active"]', timeout=10000)
    except:
        print("Pill not found")

    # Scroll to bottom
    print("Finding iframe...")
    iframe_element = page.wait_for_selector('iframe', timeout=10000)
    frame = iframe_element.content_frame()

    if not frame:
        print("Frame not found")
        return

    print("Scrolling to bottom...")
    # If padding is on iframe, content should end.
    # Scroll to end of body
    frame.evaluate("window.scrollTo(0, document.body.scrollHeight)")

    time.sleep(2)

    page.screenshot(path="verification/bottom_text_iframe_padding.png")
    print("Bottom screenshot taken at verification/bottom_text_iframe_padding.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception as e:
            print(f"Failed to launch chromium: {e}")
            exit(1)

        page = browser.new_page()
        page.set_viewport_size({"width": 375, "height": 812})

        try:
            test_scroll_behavior(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/failed.png")
        finally:
            browser.close()

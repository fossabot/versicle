import asyncio
from playwright.async_api import async_playwright
import os

from utils import setup, reset_app, capture_screenshot, ensure_library_with_book

async def test_tts_queue():
    """
    Verifies that the TTS Queue UI is visible and populated.
    Navigates to a known chapter to ensure text is available.
    """
    async with async_playwright() as p:
        # Setup (correct unpacking)
        browser, context, page = await setup(p)

        try:
            print("Resetting app...")
            await reset_app(page)

            # Ensure book exists
            print("Ensuring book exists...")
            await ensure_library_with_book(page)

            # Click on the first book (Alice in Wonderland)
            print("Opening book...")
            # Wait for book to appear
            await page.wait_for_selector('text=Alice\'s Adventures in Wonderland', timeout=10000)
            await page.click('text=Alice\'s Adventures in Wonderland')

            # Wait for reader to load
            print("Waiting for reader...")
            await page.wait_for_selector('iframe', timeout=10000)

            # --- NEW NAVIGATION STEP ---
            print("Navigating to Chapter I via TOC to ensure text availability...")
            await page.click('button[aria-label="Table of Contents"]')
            # Wait for TOC to open
            await page.wait_for_selector('text=Contents', timeout=5000)

            # Click on 'Chapter I' or a known chapter.
            # In Alice's Adventures in Wonderland, usually "Chapter I" or "Down the Rabbit-Hole" works.
            # We look for a button that contains "Chapter I"
            toc_item = page.locator("button").filter(has_text="Chapter I").first

            # Fallback if specific text not found (resilient testing)
            if await toc_item.count() == 0:
                 print("Chapter I not found by text, using nth(1)...")
                 toc_item = page.locator("ul.space-y-2 li button").nth(1)

            toc_text = await toc_item.inner_text()
            print(f"Clicking TOC item: {toc_text}")
            await toc_item.click()

            # Wait for TOC to close and page to render
            # Note: ReaderView closes TOC automatically on selection
            await page.wait_for_timeout(3000) # Give epub.js time to render the new chapter

            # ---------------------------

            # 2. Open TTS Controls
            print("Opening TTS controls...")
            await page.click('button[aria-label="Text to Speech"]')

            # Check for popup explicitly
            print("Waiting for TTS popup...")
            try:
                await page.wait_for_selector('h3:has-text("Text to Speech")', timeout=5000)
            except Exception:
                print("Popup did not appear. Attempting click again...")
                await page.click('button[aria-label="Text to Speech"]')
                await page.wait_for_selector('h3:has-text("Text to Speech")', timeout=5000)

            # 3. Check for Queue
            print("Checking for Queue...")

            # Wait for Queue header. Fail if "No text available" appears.
            # Using regex to be case insensitive (QUEUE vs Queue)
            try:
                await page.wait_for_function("""
                    /queue/i.test(document.body.innerText) || document.body.innerText.includes('No text available')
                """, timeout=10000)
            except Exception:
                print("Wait timed out. Dumping page text:")
                print(await page.inner_text("body"))
                raise

            # 4. Check for Queue Items
            await asyncio.sleep(2) # Allow queue to populate

            # Check logic: use regex for case insensitivity or multiple checks
            # 'Queue' in DOM is uppercase via CSS, but innerText might be "Queue" or "QUEUE" depending on browser engine.
            # We used regex in wait_for_function, now let's use locators.

            queue_header = page.locator("text=/Queue/i")
            queue_visible = await queue_header.count() > 0 and await queue_header.first.is_visible()

            no_text = await page.is_visible("text=No text available")

            if no_text:
                # Now this is a failure condition because we navigated to a text-heavy chapter
                print("FAILURE: 'No text available' shown despite navigating to Chapter I.")
                await capture_screenshot(page, "tts_queue_fail_no_text")
                raise Exception("TTS Queue shows 'No text available' on a text-heavy page.")

            if queue_visible:
                print("Queue header found.")
                # The queue items are buttons inside the queue container
                # Structure: <div>Queue</div> <div> <button>Sentence 1</button> ... </div>
                # We can find them by looking for buttons near the Queue header

                # Use a more generic locator relative to the "Queue" text
                queue_items = page.locator("div:has(h4:has-text('Queue')) button")
                # Alternatively, use the previous xpath approach but adapted
                if await queue_items.count() == 0:
                     # Try the previous locator if the structure is slightly different
                     queue_items = page.locator("text=/Queue/i").locator("xpath=following-sibling::div").locator("button")

                count = await queue_items.count()
                print(f"Found {count} queue items.")

                if count == 0:
                    print("FAILURE: Queue header found but 0 items.")
                    await capture_screenshot(page, "tts_queue_fail_empty")
                    raise Exception("TTS Queue is empty.")

                first_text = await queue_items.first.text_content()
                print(f"First item: {first_text}")

            else:
                 print("Neither Queue nor No text available found. (Unexpected state)")
                 await capture_screenshot(page, "tts_queue_fail_unknown")
                 raise Exception("TTS Queue UI not found.")

            await capture_screenshot(page, "tts_queue_verification")

            # Additional check: Close TTS
            print("Closing TTS controls...")
            await page.click('button[aria-label="Text to Speech"]')
            await asyncio.sleep(0.5)

            await capture_screenshot(page, "tts_queue_closed")
            print("Test Passed: TTS Queue populated successfully.")

        except Exception as e:
            print(f"Test failed: {e}")
            try:
                await capture_screenshot(page, "tts_queue_error")
            except Exception as e2:
                print(f"Failed to capture error screenshot: {e2}")
            raise
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_tts_queue())

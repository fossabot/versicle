import asyncio
import re
from playwright.async_api import async_playwright, expect
import utils

async def run_test():
    async with async_playwright() as p:
        browser, context, page = await utils.setup(p)

        print("Starting Annotations Journey...")
        await utils.reset_app(page)
        await utils.ensure_library_with_book(page)

        # Open Book
        await page.get_by_text("Alice's Adventures in Wonderland").click()
        await expect(page.get_by_label("Back")).to_be_visible()

        # Wait for iframe content
        frame = page.frame_locator("iframe").first
        await frame.locator("body").wait_for(timeout=10000)

        # 1. Create Highlight
        print("Creating Highlight...")

        # Navigate to a page with text (Next Page)
        await page.get_by_label("Next Page").click()
        await page.wait_for_timeout(2000)

        # Inject script to select text reliably
        selection_success = await frame.locator("body").evaluate("""
            () => {
                try {
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                    let node = walker.nextNode();
                    while(node) {
                        if (node.textContent.trim().length > 10) {
                            break;
                        }
                        node = walker.nextNode();
                    }

                    if (node) {
                        const range = document.createRange();
                        range.setStart(node, 0);
                        range.setEnd(node, 10);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);

                        document.dispatchEvent(new MouseEvent('mouseup', {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            clientX: 100,
                            clientY: 100
                        }));
                        return true;
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            }
        """)

        if not selection_success:
            print("Could not select text for highlighting.")
            await utils.capture_screenshot(page, "annotations_failed_selection")
            # Fail gracefully? Or retry? For now, we assume standard book content works.
            return

        # Check for Popover (Highlight Color Buttons)
        await expect(page.get_by_title("Yellow")).to_be_visible(timeout=5000)
        await utils.capture_screenshot(page, "annotations_1_popover")

        # Click Yellow
        await page.get_by_title("Yellow").click()
        await expect(page.get_by_title("Yellow")).not_to_be_visible()

        # Verify in Sidebar
        print("Verifying Highlight in Sidebar...")
        await page.get_by_label("Annotations").click()
        await expect(page.get_by_role("heading", name="Annotations")).to_be_visible()
        await expect(page.locator("ul li").first).to_be_visible()
        await utils.capture_screenshot(page, "annotations_2_sidebar_highlight")

        # Close sidebar
        await page.get_by_label("Annotations").click()

        # 2. Create Note
        print("Creating Note...")
        # Select another text segment (offset)
        await frame.locator("body").evaluate("""
            () => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let node = walker.nextNode();
                while(node) {
                     if (node.textContent.trim().length > 30) {
                         break;
                     }
                     node = walker.nextNode();
                }

                if (node) {
                    const range = document.createRange();
                    range.setStart(node, 15);
                    range.setEnd(node, 25);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                }
            }
        """)

        await expect(page.get_by_title("Add Note")).to_be_visible()
        await page.get_by_title("Add Note").click()

        # Fill Note
        await page.get_by_placeholder("Enter note...").fill("My automated note")
        await page.get_by_label("Save Note").click()

        # Verify Note in Sidebar
        print("Verifying Note in Sidebar...")
        await page.get_by_label("Annotations").click()
        await expect(page.get_by_text("My automated note")).to_be_visible()
        await utils.capture_screenshot(page, "annotations_3_sidebar_note")

        print("Annotations Journey Passed!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())

import pytest
from playwright.sync_api import Page, expect
from verification.utils import reset_app, get_reader_frame, capture_screenshot, navigate_to_chapter

def test_journey_visual_reading(page: Page):
    """
    User Journey: Visual Reading Interactions (Flow Mode)
    Verifies tap zones for page navigation and HUD toggling.
    """
    reset_app(page)

    # 1. Load Book
    page.click("text=Load Demo Book (Alice in Wonderland)")
    expect(page.locator("text=Alice's Adventures in Wonderland")).to_be_visible(timeout=5000)
    page.click("text=Alice's Adventures in Wonderland")
    expect(page.locator("div[data-testid='reader-iframe-container']")).to_be_visible(timeout=5000)

    # Wait for content
    page.wait_for_timeout(3000)

    # Navigate to Chapter 1 to ensure we have text (Cover might be image)
    print("Navigating to Chapter I...")
    # navigate_to_chapter handles opening TOC and selecting item
    navigate_to_chapter(page, "toc-item-1")

    # Wait for content after navigation
    page.wait_for_timeout(3000)

    # Get Reader Frame
    frame = get_reader_frame(page)
    assert frame, "Reader frame not found"

    # Wait for content
    try:
        frame.wait_for_selector("p", timeout=5000)
    except:
        pass

    # Get initial text
    initial_text = frame.locator("body").inner_text()
    print(f"Initial text length: {len(initial_text)}")

    viewport = page.viewport_size
    width = viewport['width'] if viewport else 1280
    height = viewport['height'] if viewport else 720

    # --- Test Next Page (Right Tap) ---
    print("Tapping Right Zone...")
    # Right 10% from edge (x > 0.8 * width)
    page.mouse.click(width * 0.9, height / 2)
    page.wait_for_timeout(3000) # Wait for page turn animation/render

    # Re-fetch frame as it might be detached/replaced
    frame = get_reader_frame(page)
    assert frame, "Reader frame lost after navigation"

    # Get new text
    new_text = frame.locator("body").inner_text()
    print(f"New text length: {len(new_text)}")

    # Assert changed
    if initial_text == new_text:
        print("Warning: Text did not change. Trying again...")
        page.mouse.click(width * 0.9, height / 2)
        page.wait_for_timeout(3000)
        frame = get_reader_frame(page)
        new_text = frame.locator("body").inner_text()

    assert initial_text != new_text, "Page did not turn (text unchanged)"

    # --- Test Prev Page (Left Tap) ---
    print("Tapping Left Zone...")
    # Left 10%
    page.mouse.click(width * 0.1, height / 2)
    page.wait_for_timeout(3000)

    # Re-fetch frame
    frame = get_reader_frame(page)
    assert frame, "Reader frame lost after prev navigation"

    prev_text = frame.locator("body").inner_text()
    assert prev_text != new_text, "Page did not turn back"

    # --- Test Toggle HUD (Center Tap) ---
    # HUD is currently visible (default)
    expect(page.locator("header")).to_be_visible()

    print("Tapping Center Zone...")
    page.mouse.click(width / 2, height / 2)

    # HUD should disappear
    expect(page.locator("header")).not_to_be_visible(timeout=3000)

    capture_screenshot(page, "visual_reading_immersive")

    # Tap Center again
    page.mouse.click(width / 2, height / 2)

    # HUD should reappear
    expect(page.locator("header")).to_be_visible(timeout=3000)

    print("Visual Reading Journey Passed!")

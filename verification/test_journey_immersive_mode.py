import re
import pytest
from playwright.sync_api import Page, expect
from verification import utils

def test_immersive_mode(page: Page):
    print("Starting Immersive Mode Journey...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # Open Book
    page.locator("[data-testid^='book-card-']").first.click()
    expect(page).to_have_url(re.compile(r".*/read/.*"))
    page.wait_for_timeout(2000)

    # Verify Header is initially visible
    header = page.locator("header")
    expect(header).to_be_visible()

    # Wait for Compass Pill to appear (ensures TTS loaded)
    expect(page.get_by_test_id("compass-pill-active")).to_be_visible(timeout=15000)

    # Enter Immersive Mode
    print("Entering Immersive Mode...")
    immersive_enter_btn = page.get_by_test_id("reader-immersive-enter-button")
    immersive_enter_btn.click()

    # Verify Header is hidden
    expect(header).not_to_be_visible()

    # Verify Exit Button is visible
    exit_btn = page.get_by_test_id("reader-immersive-exit-button")
    expect(exit_btn).to_be_visible()

    # Verify Compass Pill is Compact
    print("Verifying Compact Pill...")
    expect(page.get_by_test_id("compass-pill-compact")).to_be_visible()
    expect(page.get_by_test_id("compass-pill-active")).not_to_be_visible()

    # Verify Satellite FAB is hidden
    print("Verifying FAB is hidden...")
    expect(page.get_by_test_id("satellite-fab")).not_to_be_visible()

    utils.capture_screenshot(page, "immersive_mode_active")

    # Exit Immersive Mode
    print("Exiting Immersive Mode...")
    exit_btn.click()

    # Verify Header is back
    expect(header).to_be_visible()

    # Verify Exit Button is hidden
    expect(exit_btn).not_to_be_visible()

    # Verify Compass Pill is Active again
    print("Verifying Active Pill...")
    expect(page.get_by_test_id("compass-pill-active")).to_be_visible()
    expect(page.get_by_test_id("compass-pill-compact")).not_to_be_visible()

    # Verify Satellite FAB is visible again
    print("Verifying FAB is visible...")
    expect(page.get_by_test_id("satellite-fab")).to_be_visible()

    utils.capture_screenshot(page, "immersive_mode_exited")

    print("Immersive Mode Journey Passed!")

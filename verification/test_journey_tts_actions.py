import pytest
from playwright.sync_api import Page, expect
from verification import utils

TTS_ACTIONS = [
    ("play_pause", "tts-play-pause-button"),
    ("rewind", "tts-rewind-button"),
    ("forward", "tts-forward-button"),
]

@pytest.mark.parametrize("action, test_id", TTS_ACTIONS)
def test_journey_tts_actions(page: Page, action, test_id):
    print(f"Starting TTS Journey: {action}...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # Open book
    page.locator("[data-testid^='book-card-']").first.click()
    expect(page.get_by_test_id("reader-audio-button")).to_be_visible()

    # Open Audio Panel (it is a Sheet)
    page.get_by_test_id("reader-audio-button").click()

    # Now we expect the sheet content
    expect(page.get_by_test_id("tts-panel")).to_be_visible()

    target = page.get_by_test_id(test_id)
    expect(target).to_be_visible()
    target.click()

    utils.capture_screenshot(page, f"tts_{action}")

SPEED_PARAMS = [
    ("speed_toggle", "Playback speed"),
]

@pytest.mark.parametrize("speed_name, label", SPEED_PARAMS)
def test_journey_tts_speed(page: Page, speed_name, label):
    utils.reset_app(page)
    utils.ensure_library_with_book(page)
    page.locator("[data-testid^='book-card-']").first.click()

    expect(page.get_by_test_id("reader-audio-button")).to_be_visible()
    page.get_by_test_id("reader-audio-button").click()

    expect(page.get_by_test_id("tts-panel")).to_be_visible()

    # Switch to settings view
    page.get_by_text("Settings").click()

    # Now slider should be visible
    expect(page.get_by_label(label)).to_be_visible()

    utils.capture_screenshot(page, f"tts_{speed_name}")

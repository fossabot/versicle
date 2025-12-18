import pytest
import re
from playwright.sync_api import Page, expect
from verification import utils

SETTINGS_PARAMS = [
    ("font_serif", "Serif", "font"),
    ("font_sans", "Sans-Serif", "font"),
    ("font_dyslexic", "Monospace", "font"),
    ("theme_sepia", "Select sepia theme", "theme"),
    ("theme_dark", "Select dark theme", "theme"),
    ("theme_light", "Select light theme", "theme"),
    ("spacing_wide", "Increase line height", "line_height"),
    ("spacing_medium", "Decrease line height", "line_height"),
]

@pytest.mark.parametrize("setting_name, label_or_text, type", SETTINGS_PARAMS)
def test_journey_reader_settings(page: Page, setting_name, label_or_text, type):
    print(f"Starting Reader Setting Journey: {setting_name}...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # Open book
    page.locator("[data-testid^='book-card-']").first.click()
    expect(page.get_by_test_id("reader-visual-settings-button")).to_be_visible()

    # Open visual settings
    page.get_by_test_id("reader-visual-settings-button").click()

    # Wait for popover content
    expect(page.get_by_text("Ambience", exact=True)).to_be_visible()

    if type == "theme":
        page.get_by_label(label_or_text).click()
    elif type == "font":
        # Font family is in a select
        # Try to open select
        if page.get_by_text("Font Family").is_visible():
             page.get_by_text("Font Family").click()
        else:
             page.locator("button[role='combobox']").click()

        # Select option using role
        page.get_by_role("option", name=label_or_text, exact=True).click()

    elif type == "line_height":
         page.get_by_label(label_or_text).click()

    utils.capture_screenshot(page, f"reader_setting_{setting_name}")
    print(f"Reader Setting {setting_name} Passed!")

FONT_SIZE_PARAMS = [
    ("increase_1", "Increase font size", 1),
    ("decrease_1", "Decrease font size", 1),
]

@pytest.mark.parametrize("action_name, label, repeats", FONT_SIZE_PARAMS)
def test_journey_reader_font_size(page: Page, action_name, label, repeats):
    print(f"Starting Font Size Journey: {action_name}...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # Open book
    page.locator("[data-testid^='book-card-']").first.click()
    expect(page.get_by_test_id("reader-visual-settings-button")).to_be_visible()

    # Open settings
    page.get_by_test_id("reader-visual-settings-button").click()
    expect(page.get_by_text("Legibility")).to_be_visible()

    for _ in range(repeats):
        page.get_by_label(label).click()
        page.wait_for_timeout(200)

    utils.capture_screenshot(page, f"reader_font_size_{action_name}")

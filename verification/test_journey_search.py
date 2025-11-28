import pytest
from playwright.sync_api import Page, expect
from verification import utils

def test_search_journey(page: Page):
    print("Starting Search Journey...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # Open Book
    page.get_by_text("Alice's Adventures in Wonderland").click()
    expect(page.get_by_label("Back")).to_be_visible()

    # Open Search
    print("Opening Search...")
    page.get_by_label("Search").click()
    search_input = page.locator("input[placeholder='Search in book...']")
    expect(search_input).to_be_visible()

    results_list = page.locator("ul.space-y-4")

    # Retry search until results found (indexing might take time)
    for i in range(20):
        print(f"Search attempt {i+1}...")
        search_input.fill("Alice")
        search_input.press("Enter")

        # Wait for potential update
        page.wait_for_timeout(500)

        # Check for results
        count = page.locator("ul.space-y-4 li").count()
        print(f"List items count: {count}")

        if count > 0:
            print("Results found.")
            break
        else:
            print("No results yet, waiting...")
            page.wait_for_timeout(1000)
    else:
        raise AssertionError("Search failed to return results after attempts.")

    utils.capture_screenshot(page, "search_results")

    # Check text content of result
    first_result = page.locator("ul.space-y-4 li").first
    text = first_result.text_content()
    print(f"First result: {text}")
    assert "Alice" in text or "Wonderland" in text, "Search result should contain query terms"

    # Click result to navigate
    first_result.locator("button").click()

    # Close search using the Close button next to input
    close_btn = page.locator("input[placeholder='Search in book...']").locator("xpath=following-sibling::button")
    close_btn.click()

    utils.capture_screenshot(page, "search_after_nav")

    print("Search Journey Passed!")

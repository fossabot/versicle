
import os
from playwright.sync_api import sync_playwright

def debug_initial_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5173/")
        try:
            page.wait_for_selector("text=Alice's Adventures in Wonderland", timeout=5000)
        except:
            print("Element not found. Taking screenshot.")
            page.screenshot(path="verification/debug_home.png")

        browser.close()

if __name__ == "__main__":
    debug_initial_load()

from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        try:
            print("Navigating to http://localhost:5173/projects-verify")
            page.goto("http://localhost:5173/projects-verify")

            # Wait for the projects page title (Gestión de Proyectos)
            print("Waiting for 'Gestión de Proyectos' text...")
            page.wait_for_selector("text=Gestión de Proyectos", timeout=30000)

            # Take screenshot
            page.screenshot(path="verification/projects_optimized.png", full_page=True)
            print("Screenshot saved to verification/projects_optimized.png")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()

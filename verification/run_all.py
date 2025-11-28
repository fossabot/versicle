import asyncio
import subprocess
import sys

SCRIPTS = [
    "verification/test_journey_library.py",
    "verification/test_journey_reading.py",
    "verification/test_journey_settings.py",
    "verification/test_journey_annotations.py"
]

def run_script(script):
    print(f"Running {script}...")
    try:
        # Run subprocess and stream output
        result = subprocess.run([sys.executable, script], capture_output=False, check=True)
        print(f"✅ {script} passed.\n")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ {script} failed.\n")
        return False

def main():
    print("🚀 Starting all user journey tests...\n")
    failed = []
    for script in SCRIPTS:
        if not run_script(script):
            failed.append(script)

    if failed:
        print(f"SUMMARY: {len(failed)} tests failed.")
        for f in failed:
            print(f" - {f}")
        sys.exit(1)
    else:
        print("🎉 All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()

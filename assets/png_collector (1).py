"""
PNG Collector Script (Interactive Version)
============================================
এই script চালালে টার্মিনালে path জিজ্ঞেস করবে, তাই code-এ কিছু
পরিবর্তন করা লাগবে না।

কিভাবে ব্যবহার করবেন:
1. Terminal/CMD-এ চালান: python png_collector.py
2. Source folder path দিন (যেখানে সব subfolder + png আছে)
3. Output folder path দিন (অথবা Enter চাপলে auto একটা "All_PNGs" folder বানাবে)
"""

import os
import shutil


def collect_pngs(source_folder, output_folder, move_files=False):
    if not os.path.exists(source_folder):
        print(f"✘ Source folder পাওয়া যায়নি: {source_folder}")
        return

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    total_found = 0
    total_processed = 0

    for root, dirs, files in os.walk(source_folder):
        if os.path.abspath(root) == os.path.abspath(output_folder):
            continue

        for filename in files:
            if filename.lower().endswith(".png"):
                total_found += 1
                src_path = os.path.join(root, filename)
                dest_path = os.path.join(output_folder, filename)

                base, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(dest_path):
                    dest_path = os.path.join(output_folder, f"{base}_{counter}{ext}")
                    counter += 1

                try:
                    if move_files:
                        shutil.move(src_path, dest_path)
                    else:
                        shutil.copy2(src_path, dest_path)
                    total_processed += 1
                    print(f"✔ {filename}  ->  {os.path.basename(dest_path)}")
                except Exception as e:
                    print(f"✘ Error with {src_path}: {e}")

    print("\n----- সম্পন্ন হয়েছে -----")
    print(f"মোট PNG পাওয়া গেছে: {total_found}")
    print(f"মোট PNG processed হয়েছে: {total_processed}")
    print(f"Output folder: {output_folder}")


if __name__ == "__main__":
    print("=== PNG Collector ===\n")

    source_folder = input("Source folder path দিন (যেখানে সব subfolder আছে): ").strip().strip('"')

    output_folder = input(
        "Output folder path দিন (Enter চাপলে source folder-এর ভেতর 'All_PNGs' নামে হবে): "
    ).strip().strip('"')

    if not output_folder:
        output_folder = os.path.join(source_folder, "All_PNGs")

    move_choice = input("Move করবেন নাকি Copy? (m = move / c = copy) [default: c]: ").strip().lower()
    move_files = True if move_choice == "m" else False

    collect_pngs(source_folder, output_folder, move_files)

    input("\nচাপুন Enter বের হওয়ার জন্য...")

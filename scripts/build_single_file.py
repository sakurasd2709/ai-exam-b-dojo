# scripts/build_single_file.py
import os

def build_single_file():
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    with open("style.css", "r", encoding="utf-8") as f:
        css = f.read()

    with open("data/video_catalog.js", "r", encoding="utf-8") as f:
        video_js = f.read()

    with open("data/questions.js", "r", encoding="utf-8") as f:
        questions_js = f.read()

    with open("app.js", "r", encoding="utf-8") as f:
        app_js = f.read()

    # Replace external css link with inline style
    html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')

    # BUG-09: Remove external Google Fonts links for 100% offline standalone execution
    import re
    html = re.sub(r'\s*<link\s+rel="preconnect"[^>]*>', '', html)
    html = re.sub(r'\s*<link\s+href="https://fonts\.googleapis\.com[^"]*"[^>]*>', '', html)

    # Replace script tags with inline scripts
    scripts_bundle = f"""
  <script>
{video_js}
  </script>
  <script>
{questions_js}
  </script>
  <script>
{app_js}
  </script>
"""
    old_scripts = """  <!-- Scripts -->
  <script src="data/video_catalog.js"></script>
  <script src="data/questions.js"></script>
  <script src="app.js"></script>"""

    if old_scripts in html:
        html = html.replace(old_scripts, scripts_bundle)
    else:
        # Fallback replacement
        html = html.replace('<script src="data/video_catalog.js"></script>', '')
        html = html.replace('<script src="data/questions.js"></script>', '')
        html = html.replace('<script src="app.js"></script>', scripts_bundle)

    output_path = "AI実装検定B級_過去問演習_スマホ・PC用.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Successfully generated '{output_path}' ({size_kb:.1f} KB)!")

if __name__ == "__main__":
    build_single_file()

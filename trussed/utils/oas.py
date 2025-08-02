def get_rapi_html(openapi_url: str):
    html = f"""
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <script type="module" src="https://cdnjs.cloudflare.com/ajax/libs/rapidoc/9.3.8/rapidoc-min.js"></script>
      </head>
      <body>
        <rapi-doc
            spec-url = "{openapi_url}"
            theme = "light"
            nav-bg-color = "#fafbfc"
            primary-color = "#444444"
            bg-color = "#fafbfc"

            schema-style = "table"
            show-components = "true"
            show-header = "false"
            allow-authentication = "false"
            allow-server-selection = "false"
        >
        </rapi-doc>
      </body>
    </html>"""

    return html

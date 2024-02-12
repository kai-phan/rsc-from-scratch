import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { renderToString } from 'react-dom/server';

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === "/favicon.ico") {
      return res.end();
    }

    if (url.pathname === '/client.js') {
      await sendScript(res, './client.js');
    }

    const response = await fetch('http://localhost:8081' + url.pathname);
    if (!response.ok) {
      res.statusCode = response.status;
      return res.end();
    }

    const clientJSXString = await response.text();
    if (url.searchParams.has('jsx')) {
      // Navigation request.
      res.setHeader('Content-Type', 'application/json');
      return res.end(clientJSXString);
    } else {
      // Initial request.
      const clientJSX = JSON.parse(clientJSXString, parseJSX);
      let html = renderToString(clientJSX);

      html += `
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@canary",
              "react-dom/client": "https://esm.sh/react-dom@canary/client"
            }
          }
        </script>
        <script type="module" src="/client.js"></script>
      `;

      html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
      html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
      html += `</script>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    }
  } catch (e) {
    res.statusCode = 500;
    res.end();
  }
}).listen(8080);

async function sendScript(res, filename) {
  const content = await readFile(filename, "utf8");
  res.setHeader("Content-Type", "text/javascript");
  res.end(content);
}

function parseJSX(key, value) {
  if (value === "$RE") {
    // This is our special marker we added on the server.
    // Restore the Symbol to tell React that this is valid JSX.
    return Symbol.for("react.element");
  } else if (typeof value === "string" && value.startsWith("$$")) {
    // This is a string starting with $. Remove the extra $ added by the server.
    return value.slice(1);
  } else {
    return value;
  }
}
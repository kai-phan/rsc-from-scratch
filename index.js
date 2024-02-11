import { createServer } from 'http';
import escapeHtml from 'escape-html';
import { readFile } from 'fs/promises';

createServer(async (req, res) => {
  const postContent = await readFile('./posts/hello-world.txt', 'utf8');
  const author = 'Kai Phan';

  sendHTML(res,
    <html>
      <head>
        <title>My blog</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
        </nav>
        <article>
          ${escapeHtml(postContent)}
        </article>
        <footer>
          <hr />
          <p><i>(c) ${escapeHtml(author)}, ${new Date().getFullYear()}</i></p>
        </footer>
      </body>
    </html>
  );
}).listen(8080);

function sendHTML(res, html) {
  const htmlString = renderJSXToHTML(html);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(htmlString);
}

function renderJSXToHTML(jsx) {
  if (typeof jsx === "string" || typeof jsx === "number") {
    // This is a string. Escape it and put it into HTML directly.
    return escapeHtml(jsx);
  } else if (jsx == null || typeof jsx === "boolean") {
    // This is an empty node. Don't emit anything in HTML for it.
    return "";
  } else if (Array.isArray(jsx)) {
    // This is an array of nodes. Render each into HTML and concatenate.
    return jsx.map((child) => renderJSXToHTML(child)).join("");
  } else if (typeof jsx === "object") {
    // Check if this object is a React JSX element (e.g. <div />).
    if (jsx.$$typeof === Symbol.for("react.element")) {
      // Turn it into an an HTML tag.
      let html = "<" + jsx.type;
      for (const propName in jsx.props) {
        if (jsx.props.hasOwnProperty(propName) && propName !== "children") {
          html += " ";
          html += propName;
          html += "=";
          html += escapeHtml(jsx.props[propName]);
        }
      }
      html += ">";
      html += renderJSXToHTML(jsx.props.children);
      html += "</" + jsx.type + ">";
      return html;
    } else throw new Error("Cannot render an object.");
  } else throw new Error("Not implemented.");
}
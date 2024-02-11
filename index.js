import { createServer } from 'http';
import escapeHtml from 'escape-html';
import { readFile } from 'fs/promises';

createServer(async (req, res) => {
  const postContent = await readFile('./posts/hello-world.txt', 'utf8');
  const author = 'Kai Phan';

  sendHTML(res, `
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
          <hr>
          <p><i>(c) ${escapeHtml(author)}, ${new Date().getFullYear()}</i></p>
        </footer>
      </body>
    </html>
  `);
}).listen(8080);

function sendHTML(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}
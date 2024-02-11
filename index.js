import { createServer } from 'http';
import escapeHtml from 'escape-html';
import { readFile, readdir } from 'fs/promises';
import sanitizeFilename from 'sanitize-filename';

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  await sendHTML(res,
    <Router url={url} />
  );
}).listen(8080);

async function sendHTML(res, jsx) {
  const htmlString = await renderJSXToHTML(jsx);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(htmlString);
}

async function renderJSXToHTML(jsx) {
  if (typeof jsx === "string" || typeof jsx === "number") {
    return escapeHtml(jsx);
  } else if (jsx == null || typeof jsx === "boolean") {
    return "";
  } else if (Array.isArray(jsx)) {
    const htmls = await Promise.all(jsx.map((child) => renderJSXToHTML(child)));
    return htmls.join("");
  } else if (typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (typeof jsx.type === "string") {
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
        html += await renderJSXToHTML(jsx.props.children);
        html += "</" + jsx.type + ">";
        return html;
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type;
        const props = jsx.props;
        const returnedJsx = await Component(props);
        return renderJSXToHTML(returnedJsx);
      } else throw new Error("Not implemented.");
    } else throw new Error("Cannot render an object.");
  } else throw new Error("Not implemented.");
}

function BlogPostPage({ postSlug, postContent }) {
  return (
    <section>
      <h2>
        <a href={"/" + postSlug}>{postSlug}</a>
      </h2>
      <article>{postContent}</article>
    </section>
  );
}

function Router({ url }) {
  let page;
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    page = <BlogPostPage postSlug={postSlug} />;
  }
  return <BlogLayout>{page}</BlogLayout>;
}

async function BlogIndexPage() {
  const postFiles = await readdir("./posts");
  const postSlugs = postFiles.map((file) =>
    file.slice(0, file.lastIndexOf("."))
  );
  return (
    <section>
      <h1>Welcome to my blog</h1>
      <div>
        {postSlugs.map((slug) => (
          <Post key={slug} slug={slug} />
        ))}
      </div>
    </section>
  );
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>
          (c) {author} {new Date().getFullYear()}
        </i>
      </p>
    </footer>
  );
}

function BlogLayout({ children }) {
  const author = "Kai Phan";
  return (
    <html>
      <head>
        <title>My blog</title>
      </head>
      <body>
      <nav>
        <a href="/">Home</a>
        <hr />
      </nav>
      <main>
        {children}
      </main>
      <Footer author={author} />
      </body>
    </html>
  );
}

// async function matchRoute(url) {
//   if (url.pathname === "/") {
//     // We're on the index route which shows every blog post one by one.
//     // Read all the files in the posts folder, and load their contents.
//     const postFiles = await readdir("./posts");
//     const postSlugs = postFiles.map((file) => file.slice(0, file.lastIndexOf(".")));
//     const postContents = await Promise.all(
//       postSlugs.map((postSlug) =>
//         readFile("./posts/" + postSlug + ".txt", "utf8")
//       )
//     );
//     return <BlogIndexPage postSlugs={postSlugs} postContents={postContents} />;
//   } else {
//     // We're showing an individual blog post.
//     // Read the corresponding file from the posts folder.
//     const postSlug = sanitizeFilename(url.pathname.slice(1));
//     try {
//       const postContent = await readFile("./posts/" + postSlug + ".txt", "utf8");
//       return <BlogPostPage postSlug={postSlug} postContent={postContent} />;
//     } catch (err) {
//       throwNotFound(err);
//     }
//   }
// }

async function Post({ slug }) {
  let content;
  try {
    content = await readFile("./posts/" + slug + ".txt", "utf8");
  } catch (err) {
    throwNotFound(err);
  }
  return (
    <section>
      <h2>
        <a href={"/" + slug}>{slug}</a>
      </h2>
      <article>{content}</article>
    </section>
  )
}

function throwNotFound(cause) {
  const notFound = new Error("Not found.", { cause });
  notFound.statusCode = 404;
  throw notFound;
}
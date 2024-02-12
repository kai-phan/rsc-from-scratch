import { createServer } from 'http';
import { readFile, readdir } from 'fs/promises';
import escapeHtml from 'escape-html';
import { renderToString } from 'react-dom/server';

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/client.js') {
      await sendScript(res, './client.js');
    } else if (url.searchParams.has('jsx')) {
      url.searchParams.delete('jsx');
      await sendJSX(res, <Router url={url} />);
    } else {
      await sendHtml(res,
        <Router url={url} />
      )
    }
  } catch (e) {

  }
}).listen(8080);

async function sendScript(res, filename) {
  const content = await readFile(filename, "utf8");
  res.setHeader("Content-Type", "text/javascript");
  res.end(content);
}

async function sendHtml(res, jsx) {
  const clientJsx = await renderJSXToClientJSX(jsx);
  let html = await renderToString(clientJsx);
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

  const clientJSXString = JSON.stringify(clientJsx, stringifyJSX, 2);

  html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
  html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
  html += `</script>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

async function sendJSX(res, jsx) {
  const clientJsx = await renderJSXToClientJSX(jsx);
  const jsxString = JSON.stringify(clientJsx, stringifyJSX, 2);
  res.setHeader('Content-Type', 'application/json');
  res.end(jsxString);
}

function stringifyJSX(key, value) {
  if (value === Symbol.for("react.element")) {
    // We can't pass a symbol, so pass our magic string instead.
    return "$RE"; // Could be arbitrary. I picked RE for React Element.
  } else if (typeof value === "string" && value.startsWith("$")) {
    // To avoid clashes, prepend an extra $ to any string already starting with $.
    return "$" + value;
  } else {
    return value;
  }
}

// jsx
/**
 * {
 *   $$typeof: Symbol.for('react.element'),
 *   type: 'html',
 *   props: {
 *   children: [
 *    {
 *      $$typeof: Symbol.for('react.element'),
 *      type: 'head',
 *      props: {
 *        children: [
 *         {
 *           $$typeof: Symbol.for('react.element'),
 *           type: 'title',
 *           props: {
 *            children: 'My blog'
 *           },
 *         }
 *        ]
 *      }
 *    },
 *    {
 *      $$typeof: Symbol.for('react.element'),
 *      type: 'body',
 *    }
 *   ]
 * }
 * */

async function renderJSXToHTML(jsx) {
  if (typeof jsx === "string" || typeof jsx === "number") {
    return escapeHtml(jsx);
  } else if (jsx == null || typeof jsx === "boolean") {
    return "";
  } else if (Array.isArray(jsx)) {
    const promises = jsx.map((child) => renderJSXToHTML(child));
    const childHtml = await Promise.all(promises);
    return childHtml.join('')
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

// function BlogPostPage({ postContent, postSlug }) {
//   return (
//     <section>
//       <h2>
//         <a href={"/" + postSlug}>{postSlug}</a>
//       </h2>
//       <article>{postContent}</article>
//     </section>
//   );
// }

async function renderJSXToClientJSX(jsx) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
    jsx == null
  ) {
    // Don't need to do anything special with these types.
    return jsx;
  } else if (Array.isArray(jsx)) {
    // Process each item in an array.
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
  } else if (jsx != null && typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (typeof jsx.type === "string") {
        // This is a component like <div />.
        // Go over its props to make sure they can be turned into JSON.
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        };
      } else if (typeof jsx.type === "function") {
        // This is a custom React component (like <Footer />).
        // Call its function, and repeat the procedure for the JSX it returns.
        const Component = jsx.type;
        const props = jsx.props;
        const returnedJsx = await Component(props);
        return renderJSXToClientJSX(returnedJsx);
      } else throw new Error("Not implemented.");
    } else {
      // This is an arbitrary object (for example, props, or something inside of them).
      // Go over every value inside, and process it too in case there's some JSX in it.
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await renderJSXToClientJSX(value),
          ])
        )
      );
    }
  } else throw new Error("Not implemented");
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

function BlockLayout({ children }) {
  const author = 'Kai Phan';

  return (
    <html>
    <head>
      <title>My blog</title>
    </head>
    <body>
    <nav>
      <a href="/">Home</a>
      <hr/>
      <input/>
      <hr/>
    </nav>
    <main>
      {children}
    </main>
    <Footer author={author} />
    </body>
    </html>
  );
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

function Router({ url }) {
  let page;
  if (url.pathname === "/favicon.ico") {
    return "";
  }
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = url.pathname.slice(1);
    page = <Post slug={postSlug} />;
  }

  return <BlockLayout>{page}</BlockLayout>;
}

// async function matchRoute(url) {
//   if (url.pathname === '/') {
//     const postFiles = await readdir('./posts');
//     const postSlugs = postFiles.map((fileName) => fileName.replace(/\.txt$/, ''));
//     const postContents = await Promise.all(postFiles.map((fileName) => readFile('./posts/' + fileName, 'utf8')));
//
//     return <BlockIndexPage postSlugs={postSlugs} postContents={postContents} />;
//   } else {
//     const postSlug = url.pathname.slice(1);
//     if (url.pathname === '/favicon.ico') {
//       return '';
//     }
//     try {
//       const postContent = await readFile('./posts/' + postSlug + '.txt', 'utf8');
//       return <BlogPostPage postSlug={postSlug} postContent={postContent} />;
//     } catch (e) {
//       throwNotFound(e);
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

function throwNotFound(e) {
  const error = new Error('Not found', { cause: e });
  error.statusCode = 404;
  throw error;
}
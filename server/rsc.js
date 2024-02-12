import { createServer } from 'http';
import { readdir, readFile } from 'fs/promises';

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    await sendJSX(res, <Router url={url} />);

  } catch (e) {
    res.statusCode = 500;
    res.end();
  }
}).listen(8081);

async function sendJSX(res, jsx) {
  const clientJsx = await renderJSXToClientJSX(jsx);
  const jsxString = JSON.stringify(clientJsx, stringifyJSX, 2);
  res.setHeader('Content-Type', 'application/json');
  res.end(jsxString);
}

function stringifyJSX(key, value) {
  if (value === Symbol.for("react.element")) {
    return "$RE";
  } else if (typeof value === "string" && value.startsWith("$")) {
    return "$" + value;
  } else {
    return value;
  }
}

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

function Router({ url }) {
  let page;
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = url.pathname.slice(1);
    page = <Post slug={postSlug} />;
  }

  return <BlockLayout>{page}</BlockLayout>;
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
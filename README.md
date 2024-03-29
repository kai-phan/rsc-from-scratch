# rsc-from-scratch
This is the basic implementation of React server component from https://github.com/reactwg/server-components/discussions/5

## 1. THe traditional way of rendering a html page

## 2. Using JSX instead of html string
- We need to use babel to convert the JSX to html string

The JSX tree will be like this:
```jsx
// Slightly simplified
{
  $$typeof: Symbol.for("react.element"), // Tells React it's a JSX element (e.g. <html>)
  type: 'html',
  props: {
    children: [
      {
        $$typeof: Symbol.for("react.element"),
        type: 'head',
        props: {
          children: {
            $$typeof: Symbol.for("react.element"),
            type: 'title',
            props: { children: 'My blog' }
          }
        }
      },
      {
        $$typeof: Symbol.for("react.element"),
        type: 'body',
        props: {
          children: [
            {
              $$typeof: Symbol.for("react.element"),
              type: 'nav',
              props: {
                children: [{
                  $$typeof: Symbol.for("react.element"),
                  type: 'a',
                  props: { href: '/', children: 'Home' }
                }, {
                  $$typeof: Symbol.for("react.element"),
                  type: 'hr',
                  props: null
                }]
              }
            },
            {
              $$typeof: Symbol.for("react.element"),
              type: 'article',
              props: {
                children: postContent
              }
            },
            {
              $$typeof: Symbol.for("react.element"),
              type: 'footer',
              props: {
                /* ...And so on... */
              }              
            }
          ]
        }
      }
    ]
  }
}
```

## 3. Create a Component
A component has it own type.

```jsx
{
  $$typeof: Symbol.for("react.element"),
  type: MyComponent,
  props: {
    /* ... */
  }
}
```

## 4. Async component
Basically, async component is a component that returns a promise. Our server will wait for the promise to resolve before sending the response to the client.
By modifying the `renderJSXToHTML` function, we can handle the async component.

## 5. Preserve state on navigation
1. Add some client-side JS logic to intercept navigations (so we can refetch content manually without reloading the page). 
2. Teach our server to serve JSX over the wire instead of HTML for subsequent navigations. 
3. Teach the client to apply JSX updates without destroying the DOM (hint: we'll use React for that part).

## 6. Separate the server
1. `server/rsc.js`: This server will run our components. It always outputs JSX — no HTML. If our components were accessing a database, it would make sense to run this server close to the data center so that the latency is low.
2. `server/ssr.js`: This server will generate HTML. It can live on the "edge", generating HTML and serving static assets.

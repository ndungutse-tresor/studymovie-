import type { SeedCourse } from '../types.js';

export const webDevelopmentFoundations: SeedCourse = {
  slug: 'web-development-foundations',
  title: 'Web Development Foundations',
  summary: 'Semantic HTML, modern CSS layout, and the JavaScript language features that browsers run today.',
  description:
    'Build the three-layer mental model every web developer works from: structure, presentation, and behaviour. You will write accessible markup, lay out responsive interfaces with Flexbox and Grid, and use the parts of JavaScript that appear in production code every day.',
  category: 'Software Engineering',
  level: 'BEGINNER',
  durationHours: 10,
  accent: 'amber',
  outcomes: [
    'Write semantic, accessible HTML documents',
    'Build responsive layouts with Flexbox and CSS Grid',
    'Use the DOM API to read and update a live page',
    'Handle asynchronous work with promises and async/await',
  ],
  prerequisites: ['Basic computer literacy', 'A text editor and a modern browser'],
  chapters: [
    {
      title: 'Semantic HTML and Accessibility',
      summary: 'Document structure, meaningful elements, forms, and what assistive technology needs.',
      estimatedMinutes: 30,
      passMark: 70,
      rewardMinutes: 30,
      content: `## Structure carries meaning

HTML describes what content *is*, not what it looks like. A browser, a search crawler, and a screen reader all read the same markup and each needs the meaning to be explicit.

Semantic elements name their role:

- \`<header>\`, \`<nav>\`, \`<main>\`, \`<aside>\`, \`<footer>\` — page regions. A document should contain exactly one \`<main>\`.
- \`<article>\` — self-contained content that would still make sense republished elsewhere.
- \`<section>\` — a thematic grouping, which should carry a heading.
- \`<h1>\` through \`<h6>\` — a hierarchy, not a font size. Never skip a level to get smaller text; that is CSS's job.

A page built entirely from \`<div>\` elements renders identically and is nearly unusable with a screen reader, because nothing announces where the navigation ends and the content begins.

## Forms that work

Every input needs an associated label. The reliable pattern ties them by identifier:

\`\`\`
<label for="email">Work email</label>
<input id="email" name="email" type="email" required autocomplete="email" />
\`\`\`

The \`for\` attribute must match the input's \`id\`. This gives assistive technology the field's name and makes the label clickable, which enlarges the touch target. The \`type\` attribute selects the right mobile keyboard and enables native validation; \`autocomplete\` lets the browser fill known values.

## Images and alternative text

The \`alt\` attribute describes the image's *purpose in context*. A photo used as decoration takes \`alt=""\` so screen readers skip it. A logo that links to the home page takes \`alt="StudyReel home"\`, describing the destination rather than the picture. Omitting \`alt\` entirely is different from an empty \`alt\` — omission causes the reader to announce the filename.

## The accessibility rule of thumb

Use the native element that already does the job. A \`<button>\` is focusable, keyboard-activatable, and announced as a button for free. A \`<div>\` with a click handler is none of those things until you add a role, a tab index, and key handlers — and even then it is more fragile.`,
      questions: [
        {
          prompt: 'Why should headings follow a hierarchy rather than being chosen for their size?',
          options: [
            'Larger headings load more slowly',
            'Headings define document structure that assistive technology and crawlers rely on',
            'Browsers reject skipped heading levels',
            'CSS cannot style heading elements',
          ],
          correctIndex: 1,
          explanation: 'Heading levels communicate outline structure; visual size belongs to CSS.',
        },
        {
          prompt: 'Which markup correctly associates a label with its input?',
          options: [
            '<label>Email</label><input id="email">',
            '<label for="email">Email</label><input id="email">',
            '<label name="email">Email</label><input name="email">',
            '<input placeholder="Email">',
          ],
          correctIndex: 1,
          explanation: 'The label’s for attribute must match the input’s id to create the association.',
        },
        {
          prompt: 'What alt text is appropriate for a purely decorative image?',
          options: [
            'A full description of the image contents',
            'An empty string, alt=""',
            'No alt attribute at all',
            'The image filename',
          ],
          correctIndex: 1,
          explanation: 'An empty alt marks the image as decorative so screen readers skip it; omitting alt causes the filename to be announced.',
        },
        {
          prompt: 'Why is a native <button> preferable to a <div> with a click handler?',
          options: [
            'It renders faster in every browser',
            'It is focusable, keyboard-activatable, and announced as a button without extra work',
            'It cannot be styled, which enforces consistency',
            'It automatically submits data to the server',
          ],
          correctIndex: 1,
          explanation: 'Native controls carry keyboard and assistive-technology behaviour that must otherwise be reimplemented.',
        },
        {
          prompt: 'Which element should appear exactly once in a well-formed document?',
          options: ['<section>', '<article>', '<main>', '<nav>'],
          correctIndex: 2,
          explanation: 'A document has a single primary content region, marked by one <main> element.',
        },
      ],
    },
    {
      title: 'CSS Layout: Flexbox and Grid',
      summary: 'The box model, the cascade, and choosing between one-dimensional and two-dimensional layout.',
      estimatedMinutes: 35,
      passMark: 70,
      rewardMinutes: 30,
      content: `## The box model

Every element is a box with four concentric regions: **content**, **padding**, **border**, and **margin**. Under the default \`box-sizing: content-box\`, a declared \`width: 300px\` sizes the content alone, so padding and border widen the element beyond 300 pixels.

Nearly every codebase therefore sets:

\`\`\`
*, *::before, *::after { box-sizing: border-box; }
\`\`\`

With \`border-box\`, the declared width includes padding and border, so an element declared at 300px occupies exactly 300px. Layout arithmetic becomes predictable.

## The cascade and specificity

When several rules target one element, the winner is decided by **specificity**, counted as (inline, id, class, element):

- \`#checkout\` — one id, beats any number of classes.
- \`.card.featured\` — two classes.
- \`a:hover\` — one class-equivalent (the pseudo-class) plus one element.

Equal specificity is broken by source order: the later rule wins. Reaching for \`!important\` to win a fight almost always means the selector strategy needs simplifying instead.

## Flexbox: one dimension

Flexbox distributes space along a single axis. Set \`display: flex\`, then control the main axis with \`justify-content\` and the cross axis with \`align-items\`. It is the right tool for navigation bars, button rows, and a card's internal stack.

\`\`\`
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
\`\`\`

## Grid: two dimensions

Grid controls rows and columns at once. It is the right tool for page scaffolding and card galleries.

\`\`\`
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}
\`\`\`

That single declaration produces a responsive gallery with no media queries: \`auto-fill\` creates as many columns as fit, and \`minmax(220px, 1fr)\` keeps each at least 220 pixels wide while sharing leftover space equally.

## Choosing between them

Ask how many dimensions you are controlling. Content flowing along one axis is Flexbox. A structure with aligned rows *and* columns is Grid. The two compose freely — grid areas commonly contain flex containers.`,
      questions: [
        {
          prompt: 'What does box-sizing: border-box change about an element declared with width: 300px?',
          options: [
            'The 300px now includes padding and border',
            'The element is forced to exactly 300px of content plus margins',
            'Borders are no longer rendered',
            'The width becomes a minimum rather than a fixed size',
          ],
          correctIndex: 0,
          explanation: 'border-box folds padding and border into the declared width, making layout arithmetic predictable.',
        },
        {
          prompt: 'Which selector has the highest specificity?',
          options: ['.card.featured', '#checkout', 'a:hover', 'main section p'],
          correctIndex: 1,
          explanation: 'An id selector outranks any combination of classes, pseudo-classes, or element selectors.',
        },
        {
          prompt: 'You need a card gallery whose columns reflow responsively without media queries. Which is the right tool?',
          options: [
            'Flexbox with justify-content: space-between',
            'CSS Grid with repeat(auto-fill, minmax(220px, 1fr))',
            'Absolute positioning with calculated offsets',
            'Floats with clearfix',
          ],
          correctIndex: 1,
          explanation: 'Grid’s auto-fill with minmax produces a responsive two-dimensional gallery in one declaration.',
        },
        {
          prompt: 'In a flex container, which property distributes space along the main axis?',
          options: ['align-items', 'justify-content', 'grid-template-columns', 'flex-wrap'],
          correctIndex: 1,
          explanation: 'justify-content controls the main axis; align-items controls the cross axis.',
        },
        {
          prompt: 'Two rules have identical specificity and both apply. Which wins?',
          options: [
            'The one declared later in source order',
            'The one declared first',
            'The one with the shorter selector',
            'Neither; the property is ignored',
          ],
          correctIndex: 0,
          explanation: 'When specificity ties, the later declaration in source order takes effect.',
        },
      ],
    },
    {
      title: 'JavaScript Essentials',
      summary: 'Types, scope, functions, and the array methods that replace most loops.',
      estimatedMinutes: 35,
      passMark: 70,
      rewardMinutes: 30,
      content: `## Declarations and scope

Use \`const\` by default and \`let\` when a binding must be reassigned. Avoid \`var\`, which is function-scoped and hoisted in ways that surprise readers.

\`const\` prevents *reassignment*, not *mutation*. \`const user = { name: 'Ada' }\` forbids \`user = {}\` but permits \`user.name = 'Grace'\`. To prevent mutation you need \`Object.freeze\` or a discipline of copying.

## Value and reference

Primitives — string, number, boolean, null, undefined, symbol, bigint — are copied by value. Objects and arrays are handled by reference, so two variables can point at one object and a change through either is visible through both. This single fact explains most "why did that change?" bugs.

## Equality

\`===\` compares type and value without coercion. \`==\` coerces first, producing results like \`'' == 0\` being true. Use \`===\` universally; the one common exception is \`value == null\`, which conveniently matches both \`null\` and \`undefined\`.

## Array methods over loops

Most loops are one of three transformations, and naming them makes intent obvious:

\`\`\`
const passed = results.filter((r) => r.score >= 70);
const names  = passed.map((r) => r.learnerName);
const total  = results.reduce((sum, r) => sum + r.score, 0);
\`\`\`

\`filter\` selects, \`map\` transforms, \`reduce\` folds a list into a single value. All three return new arrays or values rather than mutating the source, which keeps data flow easy to follow. Reach for \`find\` when you want the first match, and \`some\`/\`every\` for boolean questions.

## Functions and closures

Arrow functions inherit \`this\` from the surrounding scope, which is usually what a callback wants. A **closure** is a function that keeps access to the variables of the scope it was created in, even after that scope has returned — the mechanism behind counters, memoisation, and module privacy.

## Destructuring and spread

\`\`\`
const { title, level = 'BEGINNER' } = course;
const updated = { ...course, level: 'ADVANCED' };
\`\`\`

Destructuring pulls named values out with optional defaults. The spread operator builds a **shallow** copy with overrides — the standard way to update state without mutating the original. Remember that shallow means nested objects are still shared.`,
      questions: [
        {
          prompt: 'What does const actually prevent?',
          options: [
            'Any change to the value, including object properties',
            'Reassignment of the binding, but not mutation of an object it points to',
            'The variable from being read outside its block',
            'The value from being copied',
          ],
          correctIndex: 1,
          explanation: 'const blocks reassignment only; object properties remain mutable unless frozen.',
        },
        {
          prompt: 'Which array method folds a list into a single accumulated value?',
          options: ['map', 'filter', 'reduce', 'forEach'],
          correctIndex: 2,
          explanation: 'reduce accumulates across elements to produce one result.',
        },
        {
          prompt: 'Why is === preferred over ==?',
          options: [
            'It is faster in all engines',
            'It compares type and value without coercion, avoiding surprises like \'\' == 0',
            'It works on objects by value',
            'It is the only operator that handles null',
          ],
          correctIndex: 1,
          explanation: 'Strict equality avoids the coercion rules that make == unpredictable.',
        },
        {
          prompt: 'What is a closure?',
          options: [
            'A function that has finished executing',
            'A function that retains access to variables from the scope where it was defined',
            'A block that cannot be entered twice',
            'An object with no prototype',
          ],
          correctIndex: 1,
          explanation: 'Closures capture their defining scope, which persists after that scope returns.',
        },
        {
          prompt: 'What is the result of `{ ...course, level: "ADVANCED" }`?',
          options: [
            'The original course object with level mutated in place',
            'A deep clone of course with a new level',
            'A shallow copy of course with level overridden, leaving the original unchanged',
            'A syntax error, because spread only works on arrays',
          ],
          correctIndex: 2,
          explanation: 'Object spread creates a shallow copy; nested objects are still shared by reference.',
        },
      ],
    },
    {
      title: 'The DOM and Asynchronous JavaScript',
      summary: 'Selecting and updating elements, event delegation, promises, and fetch.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 35,
      content: `## The document object model

The browser parses HTML into a tree of nodes your code can query and modify:

\`\`\`
const list = document.querySelector('#course-list');
const item = document.createElement('li');
item.textContent = course.title;
list.append(item);
\`\`\`

Prefer \`textContent\` over \`innerHTML\` when inserting values. \`innerHTML\` parses its input as markup, so any user-supplied string containing a tag becomes live HTML — the classic cross-site scripting vector. \`textContent\` always inserts plain text.

## Events and delegation

Attaching one listener per row does not scale, and it breaks for rows added later. **Delegation** attaches a single listener to a stable ancestor and inspects the event target:

\`\`\`
list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-course-id]');
  if (!button) return;
  openCourse(button.dataset.courseId);
});
\`\`\`

Because events bubble from the target up through its ancestors, the container sees clicks on any descendant — including elements created after the listener was attached.

## The event loop

JavaScript runs on a single thread. Long synchronous work blocks rendering and input entirely. Anything slow — network, timers, file access — is handed to the platform, which queues a callback for when the work completes. The event loop runs those callbacks once the call stack is empty.

## Promises and async/await

A **promise** represents a value that is not available yet. It is pending, then either fulfilled or rejected. \`async\`/\`await\` lets you write promise-based code in sequential form:

\`\`\`
async function loadCourses() {
  try {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
    return await response.json();
  } catch (error) {
    reportError(error);
    return [];
  }
}
\`\`\`

Two details catch people out. First, \`fetch\` only rejects on a *network* failure — a 404 or 500 resolves normally, so you must check \`response.ok\` yourself. Second, an \`await\` inside \`try\` is the only way \`catch\` sees the rejection; a forgotten \`await\` returns a pending promise and the error escapes.

## Running work in parallel

Sequential \`await\` calls run one after another. When requests are independent, start them together:

\`\`\`
const [courses, schedule] = await Promise.all([fetchCourses(), fetchSchedule()]);
\`\`\`

\`Promise.all\` rejects as soon as any input rejects. Use \`Promise.allSettled\` when you want every result regardless of individual failures.`,
      questions: [
        {
          prompt: 'Why is textContent safer than innerHTML for inserting user-supplied values?',
          options: [
            'textContent renders faster',
            'innerHTML parses its input as markup, allowing script injection',
            'textContent supports more characters',
            'innerHTML is deprecated',
          ],
          correctIndex: 1,
          explanation: 'innerHTML turns strings into live markup, which is the classic XSS vector; textContent inserts plain text.',
        },
        {
          prompt: 'What makes event delegation work?',
          options: [
            'Events bubble from the target up through its ancestors',
            'Listeners are copied to every child element automatically',
            'The browser re-attaches listeners after each DOM change',
            'Delegated events skip the capture phase entirely',
          ],
          correctIndex: 0,
          explanation: 'Bubbling lets a single ancestor listener observe clicks on any descendant, including ones added later.',
        },
        {
          prompt: 'A fetch call receives an HTTP 500 response. What happens to the promise?',
          options: [
            'It rejects and control moves to catch',
            'It resolves normally, so you must check response.ok yourself',
            'It retries automatically three times',
            'It throws a SyntaxError',
          ],
          correctIndex: 1,
          explanation: 'fetch only rejects on network failure; HTTP error statuses resolve and must be checked explicitly.',
        },
        {
          prompt: 'Two independent API requests are needed before rendering. What is the most efficient approach?',
          options: [
            'await each request one after the other',
            'Use Promise.all to start both concurrently and await the pair',
            'Use a synchronous XMLHttpRequest',
            'Poll each endpoint in a while loop',
          ],
          correctIndex: 1,
          explanation: 'Promise.all runs independent work concurrently instead of serialising the latency.',
        },
        {
          prompt: 'Why does long synchronous work freeze the page?',
          options: [
            'The browser disables rendering during any function call',
            'JavaScript runs on a single thread, so the event loop cannot process rendering or input',
            'Promises are cancelled while a function runs',
            'The garbage collector pauses the network stack',
          ],
          correctIndex: 1,
          explanation: 'A single thread means blocking work prevents the event loop from handling rendering and input.',
        },
      ],
    },
  ],
};

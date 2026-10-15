# MayerfeldBooks

An independent bookstore site: fiction, nonfiction, staff picks and an events list.
Assignment 1 was plain HTML/CSS; Assignment 2 rebuilds it with Vite, React and Tailwind.

## Run it

```bash
npm install
npm run dev
```

## Where things live

- `src/data/books.js`, `src/data/events.js`: all content, as arrays of objects
- `src/components/`: one component per part of the page
  - `Header`, `Hero`, `BookGrid`, `StaffPicks`, `Events`, `Footer`
  - `BookCard`: one book, used by both grids
  - `BookDetails`: shown instead of the home page for `#book/<id>` links
  - `StarRating`: controlled rating, one per book in the grid
- `src/index.css`: Tailwind import and theme colours

## useState

- `BookGrid` keeps the selected section (`All`, `Fiction`, `Nonfiction`) in state and filters `books` on every render.
- `BookGrid` also keeps every rating in one object, `{ bookId: stars }`, and passes each `StarRating` its `value` and an `onChange`. The stars have no state of their own, so a rating survives when the filter hides that card.

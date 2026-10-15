# CHECK-IN Visitor Log

A small, dependency-free web app for logging visitors in and out of a premises.

## Features

- Register a visitor with name, organisation, host, purpose and notes
- One-click check out from the "On Site" list or the log table
- Live stats: on premises, total today, checked out today
- Filter by status and search by name
- Records persist in the browser (localStorage), so a refresh does not lose data
- All user input is escaped before rendering

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Structure

```
checkin-checkout/
  index.html
  css/styles.css
  js/app.js
  README.md
  .gitignore
```

## Notes

Data is stored per browser and per device. To clear it, remove the `checkin-visitors` key from localStorage in your browser dev tools.

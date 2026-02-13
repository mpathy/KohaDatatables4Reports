# KohaDatatables4Reports

A Koha plugin that adds an interactive DataTables view to saved report results.

When viewing a report, you now can find an **"Open in DataTables"** button in the toolbar.
It fetches all report rows via Koha's built-in CSV export for better performance.

It also adds some popular DataTables functionality, so further customisation can now even be made
by users who don't have the sufficient rights to edit a report itself.

## Features

These are mostly DataTables features from the version that was already included in Koha (DataTables 2.1.8):

- **Sorting** — click any column header
- **Full-text search** — filters across all columns in real time
- **Adjustable page size** — 10 / 25 / 50 / 100 / 250 / 500 / All
- **Column visibility** — show or hide individual columns
- **Column resize** — drag the right edge of any header
- **Fixed header** — column headers stay visible while scrolling
- **Fit To Page + Word Wrap** — toggle to constrain the table to window or page width
- **Export filtered data** — Copy, CSV, Excel, PDF or Print (**respects current filter, sort and columns visibility**)

## Requirements

- Koha **24.11** or newer

## Installation

Clone the repository and build the `.kpz` plugin package directly from there:

```
git archive --output=../KohaDatatables4Reports.kpz --format=zip HEAD -- Koha
```

This packages only the `Koha/` directory (no README, no `.git`, .gitignore is read, etc.).
Note: only committed changes are included — commit first, then build.

Upload the resulting `.kpz` file via **Koha Administration → Plugins → Upload plugin**.

## Documentation

Feature documentation is available on the plugin's configure page inside Kohav(**Plugins → DataTables for Reports → Configure**).
User-configurable settings will be added there in future versions, but is postponed for now until Koha includes more recent DataTable versions.

## Contact

Bug reports are welcome via [GitHub Issues](../../issues) of my repository.
You can also reach me in the Koha Community Chat: https://chat.koha-community.org/ — my nickname is @markus

# Data

## `dmc.json`: DMC floss color catalog

489 DMC six-strand embroidery floss colors (`code`, `name`, `hex`, `rgb`), used to match image colors to real threads.

- **Source:** [craft-color-codes](https://github.com/makebead/craft-color-codes), file `data/json/dmc-floss.json`, kept unchanged (including its `sources` and `notes` fields).
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Credit:** Color data: craft-color-codes by [MakeBead](https://makebead.com)
- **Trademark:** DMC is a trademark of its owner. This project is not affiliated with or endorsed by DMC.

Checked on import: 489 colors, no duplicate codes, RGB values in range and every `hex` consistent with its `rgb`.

## `dmc_names_pt.json`: Portuguese names

A Brazilian Portuguese name for each of the 489 DMC codes (for example `"3713": "Salmão Muito Claro"`), shown next to the English name in the legend and the PDF.

- **Made by this project**, not part of the upstream catalog. Names are built from a table of base colors and a table of shades in `backend/scripts/build_dmc_names_pt.py`; edit the tables there and run the script to regenerate the file.
- Two threads in the English catalog share a name (DMC 158 and 791), so their Portuguese names match too; the code tells them apart.

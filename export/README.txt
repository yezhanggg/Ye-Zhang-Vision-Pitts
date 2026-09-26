VisionPitts: census data browser and anti-displacement housing typology matchmaker for the City of Pittsburgh
"Great decisions need vision. We give you one."

HOW TO OPEN
  1. Double-click index.html (Chrome, Edge or Safari). Code, styles and data are all inside that one file.
  2. If the map stays blank, double-click serve.command instead. It starts a local web server
     (python3 -m http.server 8765) and opens http://localhost:8765/index.html.
     Stop it later with: kill $(lsof -t -i:8765)

WHERE THINGS ARE
  The app opens on its home page; Open VisionPitts flies from a globe to Pittsburgh and lands on Explore: search an address, neighborhood, tract or ZIP; switch map layers (3D buildings,
  terrain, census tracts, block groups, ZIP codes, county, city limits); pick a census variable under Data to
  color the map; hover a shape for its value and margin of error; click it for a place card next to the city
  and the county.
  The Analysis tab holds the Track 3 tool: Match (which housing type fits a tract, and why), Compare tracts
  and Compare scenarios. "Copy link" sits in the Analysis bar.
  Click the logo for About, which holds Sources & method and Limitations.

INTERNET
  The basemap (OpenFreeMap), 3D terrain (Mapterhorn / AWS Terrain Tiles), fonts (Google Fonts) and address
  search (Photon, US Census Geocoder) load at runtime. Offline, the app still works on a plain background
  with every tract, score and comparison, and Explore shows the bundled city subset (128 tracts, 314 block
  groups, 32 ZIP codes). This file never contacts Supabase; county-wide rows are served only to the hosted app.

WHAT IS WHAT
  Explore values = ACS 2020-2024 5-year estimates with their 90% margin of error and a reliability chip.
                   Descriptive context only; nothing in Explore enters a score.
  Observed data  = factor values (0-1 percentiles across the city's residential tracts) with source, year and a
                   confidence tag.
  Your values    = slider weights and presets; the typology fit matrix is a labeled value judgment.
  Scores are computed in code (S = sum w*c(x,d) / sum w*|d|). AI text, when shown, is labeled and number-checked;
  in this single file the explanation service is not available, so the template sentence is shown.

SHAREABLE LINKS
  The address bar hash stores the view: #m=explore&L=...&g=...&v=... for Explore (layers, geography, variable,
  selected place) and #m=match|tracts|scenarios&t=...&w=...&c=... for Analysis (tracts, weights, scenarios, map
  coloring). In Analysis, "Copy link" copies it; in Explore, copy the address bar.

REBUILD
  cd app && npm install && npm run export     (writes export/index.html)

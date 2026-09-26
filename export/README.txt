VisionPitts: anti-displacement housing typology matchmaker for the City of Pittsburgh
"Great decisions need vision. We give you one."

HOW TO OPEN
  1. Double-click index.html (Chrome, Edge or Safari). Code, styles and data are all inside that one file.
  2. If the map stays blank, double-click serve.command instead. It starts a local web server
     (python3 -m http.server 8765) and opens http://localhost:8765/index.html.
     Stop it later with: kill $(lsof -t -i:8765)

INTERNET
  The basemap (OpenFreeMap), 3D terrain (Mapterhorn / AWS Terrain Tiles), fonts (Google Fonts) and address
  search (Photon, US Census Geocoder) load at runtime. Offline, the app still works on a plain background
  with every tract, score and comparison.

WHAT IS WHAT
  Observed data  = factor values (0-1 percentiles across the city's residential tracts) with source, year and a
                   confidence tag.
  Your values    = slider weights and presets; the typology fit matrix is a labeled value judgment.
  Scores are computed in code (S = sum w*c(x,d) / sum w*|d|). AI text, when shown, is labeled and number-checked;
  in this single file the explanation service is not available, so the template sentence is shown.

SHAREABLE LINKS
  The address bar hash (#m=explore&t=...) stores the view, tracts, weights, scenarios and map layer.
  Copy it with "Share".

REBUILD
  cd app && npm install && npm run export     (writes export/index.html)

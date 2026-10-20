# Sun and shadow: method

The Explore tab can replay where shadows fall over Pittsburgh through three days of the year (Data, then Sun and shadow). This page says how the shadows are made and what they can and cannot tell you. The layer is for looking; nothing here enters a score.

Added in October 2026, after the hackathon weekend. The method comes from MUSA 6950 (Lab 05 and Assignment 3, urban shadow analysis with GPU programming), scaled from one tile of Philadelphia to the whole of Pittsburgh.

## Surface

| | |
|---|---|
| Source | PASDA, "Allegheny County / Pittsburgh LiDAR 2015", terrain products ([summary page](https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=1705)) |
| Raster | `DSM6ft`: the first-return surface, so ground, buildings and trees together |
| Cells | 6 ft, 10,805 x 8,753 of them, 53% with data (the city and about 1,500 ft around it) |
| Grid | Pennsylvania South State Plane, US feet (EPSG:2272); heights in NAVD88 feet |
| Heights | 703 to 2,209 ft. The tallest building top is the US Steel Tower at 1,628 ft; the cells above it are broadcast masts |

The download is one 9 GB zip holding an Esri geodatabase. `src/visionpitts/remotezip.py` reads the zip's index and fetches only the two tables of this raster (220 MB). The raster is stored as uncompressed 128 x 128 blocks, which `shadow.read_dsm` decodes directly.

One cleaning step: the surface has a single spike, 4,225 ft over the river at the Point, with a cone interpolated around it (420 cells). Nothing real in the city is above 2,300 ft, so cells above that and the cone around them are set to the level around them (`shadow.despike`).

## Sun position

`shadow.solar_position` implements the equations behind the NOAA solar calculator, including its refraction correction. It reproduces the ten values typed off the NOAA page for Assignment 3 to within 0.05 degrees (`tests/test_shadow.py`).

- One position is used for the whole city: Downtown, 40.4406, -79.9959.
- Days: June 21, September 22 and December 21, 2026, shown in the app as Summer, Spring / Fall and Winter. September 22 stands for spring too: around March 20 the sun is as high (49.6 against 49.7 degrees at its highest) and crosses the sky 16 minutes later on the clock.
- Steps: every 30 minutes on the clock (Eastern time, daylight saving where it applies), keeping the steps where the sun is at least 2 degrees up. That gives 29 steps in June (6:30 AM to 8:30 PM), 24 in September (7:30 AM to 7:00 PM) and 18 in December (8:00 AM to 4:30 PM): 71 in all.
- Grid north: the State Plane grid is turned 1.46 degrees from true north in Pittsburgh. The sun's azimuth is measured from true north, so 1.46 degrees is added before the march. Assignment 3 left this out; over a 1,000 ft shadow it moves the tip by about 25 ft.

## The shadow march

The kernel is in `shadow.KERNEL_SRC` (CUDA C, run through PyCUDA). One GPU thread per cell:

1. Start at the cell's own height.
2. Step toward the sun one cell length at a time. At each step the sun ray has risen by `tan(elevation) x distance`.
3. If the surface cell under the ray is higher than the ray, the starting cell is in shadow. Stop.
4. If the ray is higher than the highest cell in the whole surface, or leaves the surface, the cell is in the sun. Stop.

Changes from the assignment's kernel, which this one is otherwise the same as:

| Assignment 3 | Here | Why |
|---|---|---|
| Ray stops after 2,000 ft | Ray stops when it clears the highest cell | The US Steel Tower at a 10 degree sun casts about 4,800 ft |
| Cell size typed in | Cell size read from the raster | |
| Step position truncated | Rounded to the nearest cell | Truncation pulls every sample toward the start |
| Surface uploaded to the GPU every hour | Uploaded once | |
| One tile | The whole surface in one launch | 94.6 million threads; a T4 has room |

The run: Google Colab, Tesla T4. Each of the 71 steps took about 1 to 3 seconds; the full run with page writing took 9.3 minutes.

Checking the kernel: `shadow.shadow_reference` is the same march in NumPy. Before the run, the notebook casts a 512 x 512 crop both ways at three sun positions. They agreed on every cell.

## What is published

For each day, each cell has one bit per step (1 = in shadow). The steps are packed eight to a byte and written as plain 8-bit grayscale PNG "pages", cut into web-map chunks: zoom-13 map tiles, 25 of them over the city.

| | |
|---|---|
| Cast at | 6 ft cells, 2,048 px per chunk (242 MB with its hours pages, kept locally in `nopush/shadow/out/`) |
| Regular pages | 12 ft cells, 1,024 px per chunk: 68 MB in `app/public/data/shadow/`, tracked in git. A 12 ft cell is in shadow when at least half of its four 6 ft cells are |
| Close-zoom pages | The 6 ft shadow pages as cast: 162 MB in `app/public/data/shadow/fine/`. Drawn from map zoom 15.5 where they exist. **Git-ignored by default**, so the live site runs on the regular pages unless the line in `.gitignore` is removed |
| Overview | One coarse image of the whole city (48 ft cells) for zoomed-out views |
| Hours of sun | One page per chunk and day at 12 ft: the number of sunlit steps in each cell. Hours = steps x 0.5 |

`scripts/14_publish_shadows.py` writes all of these; `--no-fine` leaves the close-zoom pages out.

In the app, one custom WebGL layer draws the chunks in view. Its shader:

- reads the bit for the step before the current moment and the bit for the step after, and mixes the two pictures, so shadows dissolve from one half hour to the next;
- weights the sixteen cells around each screen pixel smoothly and cuts the result at one half, so a shadow has a clean curved edge at any zoom instead of a staircase of square cells. The edge is an estimate between cell centers, not extra information;
- zoomed out past the data, shows the share of each screen pixel in shadow instead.

The pages are decoded in the browser with its own inflate, not as images, so no bit can be changed by color management.

## Checks on the result

- Each day's share of the surface in shadow falls toward midday and rises again: lowest at 1:30 PM on June 21 (4.6%), 1:00 PM on September 22 (22.1%), 12:00 PM on December 21 (46.8%).
- Mean hours of direct sun per cell: 9.30 on June 21, 6.46 on September 22, 3.35 on December 21.
- December 21, 12:00 PM: the US Steel Tower's shadow runs north for between 1,600 and 1,700 ft in the output. From its height above the ground around it and a 26.0 degree sun, 1,640 to 1,860 ft is expected depending on where the tip lands.
- Shadow edges line up with the basemap's streets and building outlines at zoom 16.

## By parcel

For every lot in the city, the share of the day it sits in shadow on each of the three days (`src/visionpitts/parcel_shadow.py`, `scripts/15_build_parcel_shadow.py`; added October 2026). No new GPU run: it reads the 6 ft run as it was cast.

| | |
|---|---|
| Lots | Allegheny County parcel boundaries (WPRDC, September 2026): the 142,642 shapes whose representative point is in a city tract. Kept per shape, not per parcel ID, because placeholder IDs (`NOT ASSESSED`, `COMMON GROUND`, blank) sit on 1,631 shapes across the county |
| Use class | County property assessments, class and use only (no owner, sale or address fields), classed as on the land-use map. 358 shapes have no record under their own ID |
| A lot's cells | The page pixels (about 6 ft, 35.6 sq ft each) whose center is inside the lot: 35.05 million in all, 100.1% of the lots' own area |
| Day | The steps of the shadow run: 29, 24 and 18 half hours |

Per lot and day:

- **Share of the day in shadow**: shadowed cell-steps divided by cells x steps. Of the lot's area across the whole day, the part in shadow. This colors the map.
- **Hours of direct sun**: the same figure the other way round, (1 - share) x steps x 0.5.
- **Mostly shaded**: the share of the day's steps when at least half the lot is in shadow.
- **Profile**: the share of the lot in shadow at each half hour.

A lot with fewer than 10 cells (about 360 sq ft; 3,687 lots) or with no surface under it (16) is not rated. 138,939 are.

What is written:

| | |
|---|---|
| Analysis files | `nopush/shadow/parcels/` (kept on the machine): `parcel_shadow.csv` (one row per lot), `parcel_shadow.gpkg` (the same with shapes), `parcel_profiles.parquet` (every half hour), `tract_shadow.csv` and `use_shadow.csv` (weighted by area) |
| Map files | `app/public/data/parcel-shadow/`, 58 MB: per chunk of the run's grid, the lots as GeoJSON and one row of profile bytes per lot. **Git-ignored by default**; the line in `.gitignore` is the switch for publishing them |

In the app the sun control gets a third view, **By parcel**, only where the map files are, and not on phones. Zoomed out it shows the hours-of-sun picture. From map zoom 14.5 the lots are drawn in ten steps from no shadow to shadow all day, taking over from the picture chunk by chunk as they load; the 3D buildings are hidden meanwhile. Clicking a lot shows its three days side by side and its profile for the chosen day. The lot's county label, assessed use class and size are shown; never an owner or an address.

Checks:

- For every cell with data, in every chunk and day, the shadow bits and the sunlit count of the hours page add up to the day's steps. The run stops otherwise.
- Twenty lots are counted a second way before anything is written (an even-odd ray through the lot's rings, each step unpacked on its own). All twenty agree cell for cell.
- Hours of direct sun over all rated lots, by area: 9.12 on June 21, 6.28 on September 22, 3.25 on December 21, against 9.30, 6.46 and 3.35 over every cell of the surface (which also has the streets and rivers).
- 2,588 of the 138,939 rated lots (1.9%) have less shadow on December 21 than on June 21.
- A strip 300 ft wide running from 350 to 1,500 ft due north of the US Steel Tower touches fifteen lots. At noon on December 21 eleven of them are at least 74% in shadow and the other four between 28% and 59%; all fifteen are in shadow for more of that day than of June 21.
- Three lots read in the app match their rows in the table: the three figures for each day, and the eighteen half hours of the winter profile.

Limits of the lot figures, on top of the ones below:

- **Seen from above.** A lot is its roof, yard and tree tops together. A house lot's figure is mostly sun on its roof, not sun at ground level or through a window.
- **Small lots.** A 20 ft wide lot is three cells across, and a cell is in or out by its center.
- **Two dates.** Lots are as of September 2026, the surface is from 2015.
- **Assessed use.** The use class is what the county assesses, not what stands on the lot.

## Limits

- **2015.** Buildings finished or torn down since are wrong.
- **Trees are solid.** The surface is the first lidar return, so a tree crown is a block. Tree-covered slopes read as mostly in shadow, and the share "of the city in shadow" counts rooftops and tree crowns as well as the ground.
- **Clear sky.** No clouds, no haze, no reflected light.
- **Three days.** Other dates are not interpolated.
- **The edge.** Anything more than about 1,500 ft outside the city line is not in the surface and casts nothing.
- **Between steps.** The map dissolves between half hours. It does not slide the shadow edge.
- **Flat map only.** The layer is drawn on the flat ground plane and turns Terrain off while it is on. The shadows themselves do include the hills.

## Sun for open space (built October 20, 2026)

On the Place tab online, Open space and sun in the left panel takes the open space as a share of the lot and who uses it. The fifth project question answers on the right. Built by `scripts/20_build_sun_tract.py` (`src/visionpitts/sun_tract.py`) into `app/src/data/lazy/sun_tract.json`, 32 KB. Only tract figures are published; the lot files stay on the machine.

- **Fit.** Footprint = homes × gross floor area a home ÷ stories. Gross floor area is the mix-weighted net size ÷ net-to-gross, both pencil examples. The footprint is checked against the lot set under Site, less the open space, and against the district's coverage limit.
- **Which lots.** Vacant lots, and lots whose representative point lies in a parks zoning district (park-zoned lots are counted apart from vacant ones). Only rated lots count.
- **Yardstick.** Pittsburgh has no rule. UK BRE BR 209 asks that at least half of an outdoor amenity space get two or more hours of sun on March 21; the run's September 22 has the same sun. Per lot it is read as the hours with at least half the lot in sun: (1 − mostly shaded) × steps × 0.5. The sunny half may move during the day, so this is a proxy.
- **References.** The same count on December 21 (the harder test at Pittsburgh's latitude), and NYC CEQR's 6 hours on the lot's own hours.
- **Citywide.** 19,393 of 20,821 rated vacant lots meet the yardstick on Sep 22, and 9,079 on Dec 21. Park-zoned: 3,887 of 4,484, and 1,209. The equinox test rarely rules a lot out; December does.
- **Still not built.** What a proposed building does to the sun on a park next to it needs a second run with the building in the surface. Trees still count as solid.

## Rebuild

```bash
uv run python scripts/13_build_shadow_notebook.py     # writes nopush/shadow/VisionPitts_shadow.ipynb
# Colab: upload the notebook, runtime T4 GPU, Run all; unzip the download into nopush/shadow/out/
uv run python scripts/14_publish_shadows.py           # checks the run, publishes 12 ft pages plus the 6 ft close-zoom pages
uv run python scripts/13_build_shadow_notebook.py --dry-run 8   # no GPU: coarse CPU run for testing the map layer
uv run python scripts/15_build_parcel_shadow.py       # no GPU: shadow by parcel from the run in nopush/shadow/out/ (under a minute)
uv run python scripts/20_build_sun_tract.py           # tract sun for open space, from step 15's lot files (seconds)
```

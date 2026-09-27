# FlightPlayer

A lightweight browser-based flight playback and visualization tool for
KML flight-track data.

FlightPlayer displays a flight simultaneously on an interactive map and
an altitude/time graph. The flight can be played back, inspected, and
focused on a selected portion of the flight.

## Features

- Load flight tracks from KML files
- Support KML `gx:Track` flight data
- Display the complete flight path on a Leaflet map
- Display altitude versus time
- Display speed and heading information
- Aircraft playback animation
- Interactive graph cursor
- Tooltip with:
  - Time
  - Altitude
  - Speed
  - Heading
- Focus on a selected portion of the flight
- Play only the focused region
- Reset Focus
- Export the focused portion as a new KML file
- Dark/light mode
- Handles large KML files with route-point reduction for map display

## Basic Usage

1. Open `FlightPlayer.html`.
2. Load a KML flight file.
3. The flight path appears on the map and graph.
4. Press Play to animate the flight.
5. Hover over the graph to inspect flight information.

### Focus

Hold `Shift` and drag across the graph to select a portion of
the flight.

The selected region is displayed as the Focus range.

You can then:

- Play the focused portion
- Reset Focus
- Export the focused portion as KML

### Focused KML Export

`Export Focused KML` creates a new KML file containing the selected
portion of the flight.

This makes it possible to:

1. Load a large flight
2. Select an interesting section
3. Export that section
4. Load the exported KML independently

## Supported Data

FlightPlayer is primarily designed for KML files containing
Google Earth `gx:Track` data with timestamps and coordinates.

Typical data includes:

- Latitude
- Longitude
- Altitude
- Timestamp

Additional flight information such as speed and heading may be
calculated or supplied by the application.

## Running

FlightPlayer is a client-side application.

There is no server or database required.

The simplest way to use it is to open:

    FlightPlayer.html

in a modern browser.

Depending on browser security restrictions, running the application
through a small local HTTP server may be preferable.

For example:

    python -m http.server 8000

Then open:

    http://localhost:8000/FlightPlayer.html

## Project Structure

    FlightPlayer/
    │
    ├── FlightPlayer.html
    ├── app.js
    ├── graph.js
    ├── map.js
    ├── parser.js
    ├── sampler.js
    ├── kmlWriter.js
    │
    ├── css/
    │   └── ...
    │
    ├── images/
    │   └── ...
    │
    └── samples/
        └── sample-flight.kml

## Technologies

- JavaScript
- HTML
- CSS
- Leaflet
- SVG
- KML / Google Earth `gx:Track`

## Known Limitations

### International Date Line

Flights crossing the International Date Line can expose edge cases
in Leaflet's polyline rendering, particularly when focusing on the
final approach portion of a flight.

Playback and focused KML export continue to work, but the displayed
map path may disappear for certain post-Date-Line segments.

This is a known visualization limitation and does not affect the
underlying flight data.

## Credits

FlightPlayer uses:

- Leaflet for interactive maps
- OpenStreetMap map data
- Other third-party libraries/assets as documented in the project

Please see the applicable licenses and attribution requirements for
third-party components.

## License

See LICENSE.md. 

## Version

** Start the Web server with ```python.exe -m http.server 8000```

                 Raw GPS coordinates
                        │
                        ▼
              sampler.js / flight data
                        │
             ┌──────────┴──────────┐
             │                     │
       Raw geographic         Visual display
        coordinates            coordinates
             │                     │
             │              unwrapRoute()
             │                     │
             │          ┌──────────┼──────────┐
             │          │          │          │
             │        Blue       Red       Aircraft
             │        route      trail       SVG
             │          │          │          │
             └──────────┴──────────┴──────────┘
                        │
                  Leaflet rendering
Parser
    ↓
Flight
    ↓
Sampler
    ↓
AnimationEngine
    ↓
Map + Graph + InfoPanel    


| Key         | Action               |
| ----------- | -------------------- |
| **Space**   | Play / Pause         |
| **←**       | Back 500 samples     |
| **→**       | Forward 500 samples  |
| **Ctrl+←**  | Back 50 samples      |
| **Ctrl+→**  | Forward 50 samples   |
| **Shift+←** | Back 5000 samples    |
| **Shift+→** | Forward 5000 samples |
| **Home**    | First sample         |
| **End**     | Last sample          |


** Darkmode Stadia API key  
https://client.stadiamaps.com/signup/

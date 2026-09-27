Yes, there are several free ADS-B related resources to download flight route data without using FlightAware. 

ADSB.lol: Offers a free REST API and historical archived data downloads, though coverage may vary by region. 
ADSBDB: A free public API that provides flight route data (origin/destination) queryable by ICAO hex code or callsign, though the database is not exhaustive. 
ADSB.fi: Provides open data and APIs, noted for having a large number of feeders for broad coverage. 
Airplanes.live: Offers a free API guide and tracks significantly more airplanes than some competitors; it also sources route information from Flightera. 
AirLabs: Provides a free/personal tier API for commercial flight routes based on published schedules. 
AeroDataBox: Mentioned as an inexpensive option that may fit specific route data needs. 

For historical data specifically, ADSB.lol is the primary free source cited, while ADSBHub is also noted for free commercial-use data.  Note that delay information and precise runway usage often require commercial data providers. 

These sites allow you to view a past flight in your browser and download the track directly without coding:

ADSBexchange: On a flight's history page, scroll down the left-hand information pane to find an "Export to KML" button.  This is widely considered the best free source for unfiltered historical tracks.
ADSB.lol: Similar to ADSBexchange, individual flight pages often include an option to export the track log to KML. It is noted for freely licensing data with attribution. 
ADSB.fi & The Air Traffic: These platforms also typically feature a KML download link at the bottom of the flight details pane for completed flights. 
CSV and Bulk Data (API & Archives)
If you need raw coordinate data (CSV) or bulk historical archives rather than a visual KML file:

OpenSky Network: Offers a powerful CSV export via their command-line interface (CLI) or Python scripts.  You can query by date, aircraft ICAO hex, or callsign to generate a CSV file of the trajectory. Note that accessing their full historical database requires a free account.

ADSB.lol (GitHub Archives): Provides massive daily tarballs of global historical data.  These are not single-flight CSVs but complete raw logs (in json/msg format) that can be processed into CSV for any flight on that day.
ATSB KML Creator: A free tool provided by the Australian Transport Safety Bureau. You can input raw flight data (latitude, longitude, altitude) in CSV format to generate a custom KML file for Google Earth. 

CSV and Bulk Data (API & Archives)
If you need raw coordinate data (CSV) or bulk historical archives rather than a visual KML file:

OpenSky Network: Offers a powerful CSV export via their command-line interface (CLI) or Python scripts.  You can query by date, aircraft ICAO hex, or callsign to generate a CSV file of the trajectory. Note that accessing their full historical database requires a free account.
ADSB.lol (GitHub Archives): Provides massive daily tarballs of global historical data.  These are not single-flight CSVs but complete raw logs (in json/msg format) that can be processed into CSV for any flight on that day.
ATSB KML Creator: A free tool provided by the Australian Transport Safety Bureau. You can input raw flight data (latitude, longitude, altitude) in CSV format to generate a custom KML file for Google Earth. 

| Site | KML Support | CSV Support | Method |
| :--- | :--- | :--- | :--- |
| **ADSBexchange** | **Yes** (Direct) | No (Web) | Web Interface |
| **ADSB.lol** | **Yes** (Direct) | **Yes** (Bulk Archives) | Web Interface / GitHub |
| **OpenSky Network** | No (Native) | **Yes** (Direct) | CLI / API / Python |
| **ADSB.fi** | **Yes** (Direct) | No (Web) | Web Interface |

For a single file download of a specific past flight, ADSBexchange is generally the most reliable free option for KML.  For programmatic access to CSV data, OpenSky Network is the standard free choice. 

Top Free Online Viewers (No Login Required)
1. QuickMapTools KML Viewer

Best For: Privacy and speed. It processes the file entirely in your browser (client-side), meaning your flight data is never uploaded to a server. 
Why it helps: It is very tolerant of formatting quirks (like the separate <when> and <gx:coord> blocks) that confuse Google Earth Desktop. It renders the path immediately on an interactive map.
Link: quickmaptools.com/show-kml
2. GeoJSON.io (via conversion)

Best For: Debugging the "two lines" issue.
How to use: Although it natively prefers GeoJSON, you can often drag your KML in, or use a converter tab if available. It visualizes data as simple vector lines, which strips away the complex 3D altitude modeling that often causes the "weird" double-line effect in Google Earth. 
Link: geojson.io
3. SunEarthTools GPS Viewer

Best For: Detailed track analysis. It specifically supports KML, GPX, and CSV and is designed for GPS track logs. 
Why it helps: It plots the points strictly by coordinate order, often ignoring the complex time-sync issues that break Google Earth's 3D renderer. It also allows you to see the elevation profile separately. 
Link: sunearthtools.com/tools/gps-view.php
4. MapKmlTools (Earth Pro Web)

Best For: A full "Google Earth Pro" experience in the browser. 
Features: It allows you to view, edit, and even merge the two separate <gx:Track> blocks if needed, all without installing software. 
Link: mapkmltools.com/kml-editor

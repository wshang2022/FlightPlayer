/*
==========================================================
FlightPlayer Lite 2
map.js
==========================================================
*/
"use strict";
class MapView {
    constructor(mapId) {
        this.displayLon = null;
        this.map = L.map(mapId, {
            zoomControl: true
        });
        this.map.setView(
            // [39.5, -98.35], // roughly the center of the continental US
            [40.8, -74.5], // roughly in NJ
            4
        );
        /* Sept 10 this.lightTileLayer =
            L.tileLayer( "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                { attribution: "© OpenStreetMap contributors" }); */
        this.lightTileLayer =
            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution: "© OpenStreetMap contributors",
                    crossOrigin: "anonymous"
                }
            );
        this.darkTileLayer =
            L.tileLayer(
                "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
                {
                    attribution: "© OpenStreetMap © CARTO",
                    crossOrigin: "anonymous"
                }
            );
        this.lightTileLayer.addTo( this.map);
        this.routeLine = null;
        this.trailLine = null;
        this.aircraft = null;
        this.startMarker = null;
        this.finishMarker = null;
        this.route = [];
    }
    unwrapRoute(points) {
        if (points.length === 0) return [];
        const result = [];
        let previousLon = points[0].lon;
        result.push([
            points[0].lat,
            previousLon
        ]);
        for (let i = 1; i < points.length; i++) {
            let lon = points[i].lon;
            let delta = lon - previousLon;
            if (delta < -180) {
                lon += 360;
            }
            else if (delta > 180) {
                lon -= 360;
            }
            result.push([ points[i].lat, lon ]);
            previousLon = lon;
        }
        return result;
    }
    //--------------------------------------------------
    // Remove existing layers
    //--------------------------------------------------
    clear() {
        [
            this.routeLine,
            this.trailPolyline,
            this.aircraft,
            this.startMarker,
            this.finishMarker
        ].forEach(layer => {
            if (layer) this.map.removeLayer(layer);
        });
        this.route = [];
        this.unwrappedRoute = [];
        this.lastTrailIndex = -1;
    }
    //--------------------------------------------------
    // Load route
    //--------------------------------------------------
    loadFlight(flight) {
        this.clear();
        this.route = flight.points;
        const latlngs =
            this.route.map(p => [p.lat, p.lon]);
        const displayRoute =
            this.getRouteDisplayPoints(
                this.route,
                5000
            );
        const routePoints =
            this.unwrapRoute(displayRoute);
        this.routeLine =
            L.featureGroup();
        L.polyline(
            routePoints,
            {
                color: "#3b82f6",
                weight: 3,
                opacity: 0.7
            }
        ).addTo(this.routeLine);
        this.routeLine.addTo(this.map);
        this.trailLine = L.featureGroup().addTo(this.map);
        // 1. Pre-unwrap the entire route ONCE at load time (fast!)
        this.unwrappedRoute = this.unwrapRoute(this.route);
        // 2. Create one persistent polyline instead of an empty featureGroup
        this.trailPolyline = L.polyline([], {
            color: "#ff3333",
            weight: 4
        }).addTo(this.map);
        this.lastTrailIndex = -1;
        this.startMarker =
            L.circleMarker(
                latlngs[0],
                {
                    radius: 6,
                    color: "green",
                    fillColor: "green",
                    fillOpacity: 1
                }
            ).addTo(this.map);
        this.finishMarker =
            L.circleMarker(
                latlngs[latlngs.length - 1],
                {
                    radius: 6,
                    color: "red",
                    fillColor: "red",
                    fillOpacity: 1
                }
            ).addTo(this.map);
        //------------------------------------------
        // Aircraft
        //------------------------------------------
        const airplaneIcon = L.divIcon({
            className: "aircraft-icon",
            html:
                `<img src="images/aircraft.svg" ` +
                `class="aircraft-svg">`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        this.aircraft =
            L.marker(
                latlngs[0],
                { icon: airplaneIcon }
            ).addTo(this.map);
        this.map.fitBounds(
            this.routeLine.getBounds(),
            {
                padding: [40, 40],
                animate: false
            }
        );
    }
    //--------------------------------------------------
    // Move aircraft
    //--------------------------------------------------
    moveAircraft(point) {
        if (!this.aircraft) return;
        const lon = point.lon;
        if (this.displayLon === null) {
            const centerLon =
                this.map.getCenter().lng;
            let candidate = lon;
            while ( candidate - centerLon > 180)
                candidate -= 360;
            while ( candidate - centerLon < -180)
                candidate += 360;
            this.displayLon = candidate;
        }
        else {
            const delta = lon - this.displayLon;
            // Crossed Date Line:
            //   179.9 -> -179.9
            if (delta < -180) { this.displayLon = lon + 360; }
            // Crossed Date Line:
            //   -179.9 -> 179.9
            else if (delta > 180) { this.displayLon = lon - 360; }
            else { this.displayLon = lon; }
        }
        this.aircraft.setLatLng([
            point.lat,
            this.displayLon
        ]);
    }
    //--------------------------------------------------
    // Rotate aircraft
    //--------------------------------------------------
    rotateAircraft(heading) {
        if (!this.aircraft) return;
        const el = this.aircraft.getElement();
        const img = el?.querySelector("img");
        if (!img) return;
        img.style.transform = `rotate(${heading}deg)`;
    }
    //--------------------------------------------------
    // Grow trail
    //--------------------------------------------------
    updateTrail(sourceIndex) {
        if (!this.trailPolyline || !this.unwrappedRoute) return;
        // 1. Guard: only update when sourceIndex actually advances
        if (sourceIndex === this.lastTrailIndex) return;
        this.lastTrailIndex = sourceIndex;
        // 2. Slice the already-unwrapped coordinates (zero coordinate conversions)
        const pts = this.unwrappedRoute.slice(0, sourceIndex + 1);
        // 3. Update existing Leaflet polyline in-place
        this.trailPolyline.setLatLngs(pts);
    }
    //--------------------------------------------------
    // Popup
    //--------------------------------------------------
    showPopup(point) {
        L.popup()
            .setLatLng(
                [
                    point.lat,
                    point.lon
                ]
            )
            .setContent(
                "<b>" +
                Utils.formatTime(point.time) +
                "</b><br>" +
                Utils.formatAltitude(point.alt)
            )
            .openOn(this.map);
    }
    setDarkMode( dark) {
        if (dark) {
            if ( this.map.hasLayer( this.lightTileLayer)
            ) {
                this.map.removeLayer( this.lightTileLayer);
            }
            if ( !this.map.hasLayer( this.darkTileLayer)
            ) {
                this.darkTileLayer.addTo( this.map);
            }
        } else {
            if ( this.map.hasLayer( this.darkTileLayer)
            ) {
                this.map.removeLayer( this.darkTileLayer);
            }
            if ( !this.map.hasLayer( this.lightTileLayer)
            ) {
                this.lightTileLayer.addTo( this.map);
            }
        }
    }
    focusSamples(samples, first, last) {
        if (!samples || samples.length === 0) return;
        if (last === null) last = samples.length - 1;
        if (first < 0) first = 0;
        if (last >= samples.length) last = samples.length - 1;
        if (first > last) return;
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLon = Infinity;
        let maxLon = -Infinity;
        for (let i = first; i <= last; i++) {
            const sample = samples[i];
            const lat = sample[0];
            const lon = sample[1];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
        }
        if (!Number.isFinite(minLat) ||
            !Number.isFinite(maxLat) ||
            !Number.isFinite(minLon) ||
            !Number.isFinite(maxLon))
            return;
        const bounds = [
            [minLat, minLon],
            [maxLat, maxLon]
        ];
        this.map.fitBounds(
            bounds, { padding: [30, 30] }
        );
    }
    getRouteDisplayPoints(route, maxPoints = 5000) {
        if (!route || route.length === 0)
            return [];
        if (route.length <= maxPoints)
            return route;
        const step =
            (route.length - 1) / (maxPoints - 1);
        const points = [];
        for (let i = 0; i < maxPoints; i++) {
            const index =
                Math.round(i * step);
            points.push(route[index]);
        }
        return points;
    }
    //--------------------------------------------------
    // Capture Leaflet map for export
    //--------------------------------------------------
    captureMap(callback) {
        if ( typeof leafletImage === "undefined") {
            console.error( "leafletImage is not loaded");
            callback(null,null);
            return;
        }
        //--------------------------------------------------
        // Export container
        //--------------------------------------------------
        const container = document.getElementById( "mapExportCapture");
        if (!container) {
            console.error( "mapExportCapture not found");
            callback(null,null);
            return;
        }
        // Clear previous export map
        container.innerHTML = "";
        // Create export map
        const exportMap =
            L.map(
                container,
                {
                    zoomControl: false,
                    attributionControl: false
                }
            );
        // Match current map view
        exportMap.setView(
            this.map.getCenter(),
            this.map.getZoom(),
            { animate: false }
        );
        // Frame the whole route inside the 1280x720 video with 50px padding:
        exportMap.fitBounds(this.routeLine.getBounds(), {
            padding: [50, 50],
            animate: false
        });
        // Determine active theme
        const dark = this.map.hasLayer( this.darkTileLayer);
        // Add matching tile layer
        let exportTileLayer;
        if (dark) {
            exportTileLayer =
                L.tileLayer(
                    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
                    { crossOrigin: "anonymous" }
                );
        } else {
            exportTileLayer =
                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    { crossOrigin: "anonymous" }
                );
        }
        exportTileLayer.addTo(
            exportMap
        );
        // Wait for tiles
        exportTileLayer.once(
            "load",
            () => {
                // Capture export map
                leafletImage(
                    exportMap,
                    (error, canvas) => {
                        if (error) {
                            console.error( "Export map capture failed:", error);
                            exportMap.remove();
                            callback(null,null);
                            return;
                        }
                        console.log( "Export map captured");
                        // Capture the exact bounds of the 1280x720 map image:
                        const bounds = exportMap.getBounds();
                        // Cleanup map
                        exportMap.remove();
                        container.innerHTML = "";
                        // Return captured canvas
                        // callback(canvas);
                        callback(canvas,bounds);
                    }
                );
            }
        );
    }
}

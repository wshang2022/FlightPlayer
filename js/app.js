/*
==========================================================
FlightPlayer Lite 2
app.js
==========================================================
*/
"use strict";
//==========================================================
// Global Objects
//==========================================================
let mapView = null;
let animation = null;
let currentFlight = null;
let graph = null;
let mapExportRenderer = null;
let exporting = false;
let wasLooping = false;
//==========================================================
// UI Controls
//==========================================================
const btnOpen = document.getElementById("btnOpen");
const fileInput = document.getElementById("fileInput");
const btnPlay = document.getElementById("btnPlay");
const btnPause = document.getElementById("btnPause");
const btnRestart = document.getElementById("btnRestart");
const loopButton = document.getElementById("loopButton");
const flightDate =
    document.getElementById("flightDate");
const speedSelect =
    document.getElementById("speed");
const timeline =
    document.getElementById("timeline");
//==========================================================
// Information Panel
//==========================================================
const statusText =
    document.getElementById("status");
const pointNumber =
    document.getElementById("pointNumber");
const flightTime =
    document.getElementById("flightTime");
const altitude =
    document.getElementById("altitude");
const latitude =
    document.getElementById("latitude");
const longitude =
    document.getElementById("longitude");
const heading =
    document.getElementById("heading");
const speedDisplay =
    document.getElementById("speedDisplay");
const flightName =
    document.getElementById("flightName");
const takeoffDisplay =
    document.getElementById( "takeoffDisplay");
const landingDisplay =
    document.getElementById( "landingDisplay");
const durationDisplay =
    document.getElementById( "durationDisplay");
const distanceDisplay =
    document.getElementById( "distanceDisplay");
const averageSpeedDisplay = document.getElementById( "averageSpeedDisplay");
const darkModeButton = document.getElementById( "darkModeButton");
const focusStatus = document.getElementById("focusStatus");
const focusStatusText = document.getElementById("focusStatusText");
const resetFocusBtn = document.getElementById("resetFocusBtn");
darkModeButton.addEventListener(
    "click",
    () => {
        document.body.classList.toggle( "dark");
        mapView.setDarkMode( document.body.classList.contains("dark"));
        graph.redraw();
    }
);
document.getElementById("exportFocusedBtn").addEventListener( "click", exportFocusedFlight);
resetFocusBtn.addEventListener("click", () => {
    if (graph) graph.resetFocus();
});
//==========================================================
// Startup
//==========================================================
window.addEventListener("load", initialize);
function initialize() {
    // Create Map
    mapView = new MapView("map");
    // Animation Engine
    if (typeof AnimationEngine !== "undefined") {
        animation = new AnimationEngine(1);
    }
    // UI
    disablePlayback(true);
    setStatus(
        "Ready",
        "status-ready"
    );
    // Events
    btnOpen.addEventListener( "click", openFileDialog);
    fileInput.addEventListener( "change", loadKML);
    btnPlay.addEventListener( "click", onPlay);
    btnPause.addEventListener( "click", onPause);
    btnRestart.addEventListener( "click", onRestart);
    const exportButton = document.getElementById( "exportButton");
    const exportStatus = document.getElementById( "exportStatus");
    timeline.addEventListener( "input", onTimelineChanged);
    speedSelect.addEventListener( "change", onSpeedChanged);
    loopButton.addEventListener("click", () => {
        if (!animation) return;
        animation.loop = !animation.loop;
        loopButton.textContent = animation.loop ? "↻ Loop ON" : "↻ Loop";
        //loopButton.textContent = "Loop";
        loopButton.classList.toggle( "active", animation.loop);
    });
    graph = new FlightGraph( "flightChartSvg");
    graph.onSeek =
        sampleIndex => {
            timeline.value = sampleIndex;
            onTimelineChanged();
            graph.updateCursor(sampleIndex);
        };
    graph.onDragStart = () => {
            graph.wasPlaying = animation.isPlaying();
            animation.pause();
    };
    graph.onDragEnd = () => {
        if (graph.wasPlaying) animation.play();
    };
    graph.onFocus = (samples, start, end) => {
        //console.log( "Focus:", start, end  ); 
        mapView.focusSamples( samples, start, end);
        animation.setPlaybackRange(start, end);
        updateFocusStatus(start, end);
    };
    //--------------------------------------------------
    // Capture current map
    //--------------------------------------------------
    exportButton.addEventListener("click", () => {
        if (!animation || !mapExportRenderer)
            return;
        //--------------------------------------------------
        // Stop export manually
        //--------------------------------------------------
        if (exporting) {
            if (mapExportRenderer.recording) {
                mapExportRenderer.stopRecording();
                disablePlayback(false);
            }
            animation.pause();
            animation.loop = wasLooping;
            exporting = false;
            exportStatus.textContent = "";
            exportStatus.classList.remove(
                "recording"
            );
            exportButton.textContent =
                "Export Video";
            return;
        }
        //--------------------------------------------------
        // Start export
        //--------------------------------------------------
        wasLooping = animation.loop;
        animation.loop = false;
        exporting = true;
        // animation.seek(animation.playStart); // Disabled 9/11 because starting point should not be alwasy from the begginging rewind first before capturing
        //--------------------------------------------------
        // Capture current map
        //--------------------------------------------------
        mapView.captureMap( (mapCanvas, bounds) => {
                if (mapCanvas) {
                    mapExportRenderer.setMapImage( mapCanvas, bounds);
                    console.log( "Leaflet map captured");
                } else {
                    console.warn( "Using export fallback background");
                }
                //--------------------------------------------------
                // Start recording
                //--------------------------------------------------
                disablePlayback(true);
                mapExportRenderer.startRecording();
                //--------------------------------------------------
                // Update UI
                //--------------------------------------------------
                exportStatus.textContent = "● RECORDING";
                exportStatus.classList.add( "recording");
                exportButton.textContent = "Stop Export";
                // Start playback
                animation.play();
            }
        );
    });
    window.addEventListener( "keydown", onKeyDown);
    mapExportRenderer = new MapExportRenderer();
    // window.mapExportRenderer = mapExportRenderer;
    console.log( "MapExportRenderer:", mapExportRenderer.getWidth(), mapExportRenderer.getHeight());
    console.log("Application initialized.");
}
//==========================================================
// UI Events
//==========================================================
function openFileDialog() {
    fileInput.click();
}
function onPlay() {
    if (!animation) return;
    animation.play();
}
function onPause() {
    if (!animation) return;
    animation.pause();
}
function onRestart() {
    if (!animation) return;
    animation.restart();
}
function onTimelineChanged() {
    if (!animation) { console.log("animation is null"); return; }
    animation.seek( Number(timeline.value));
}
function seekRelative(step) {
    if (!animation) return;
    const newIndex =
        Math.max(
            0,
            Math.min( Number(timeline.value) + step, animation.getSampleCount() - 1)
        );
    timeline.value = newIndex;
    onTimelineChanged();
}
function onKeyDown(event) {
    if (!animation)
        return;
    //--------------------------------------------------
    // Ignore typing in controls
    //--------------------------------------------------
    if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
    )
        return;
    let step = 500;
    if (event.ctrlKey)
        step = 50;
    if (event.shiftKey)
        step = 5000;
    switch (event.key) {
    //------------------------------------------
    case " ":
        event.preventDefault();
        if (animation.isPlaying())
            animation.pause();
        else
            animation.play();
        break;
    //------------------------------------------
    case "ArrowLeft":
        event.preventDefault();
        seekRelative(-step);
        break;
    //------------------------------------------
    case "ArrowRight":
        event.preventDefault();
        seekRelative(step);
        break;
    //------------------------------------------
    case "Home":
        event.preventDefault();
        timeline.value = 0;
        onTimelineChanged();
        graph.updateCursor(0);
        break;
    //------------------------------------------
    case "End":
        event.preventDefault();
        timeline.value =
            animation.getSampleCount() - 1;
        onTimelineChanged();
        graph.updateCursor(
            animation.getSampleCount() - 1
        );
        break;
    }
}
function onSpeedChanged() {
    if (!animation) return;
    animation.setSpeed( parseFloat(speedSelect.value));
}
//==========================================================
// KML Loading 
// ========================================================== 
function loadKML(event) {
    const file = event.target.files[0];
    if (!file) return;
    setStatus( "Loading KML...", "status-playing");
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = function () {
        try {
            //--------------------------------------------------
            // Parse
            //--------------------------------------------------
            //const parser = new Parser( flightDate.value); // Original due to parseCSV
            const parser = new Parser();
            if (ext === "kml") {
                try {
                    const flight = parser.parseKML(reader.result);
                    currentFlight = flight;
                }
                catch (error) {
                    console.error(error);
                    alert( "Unable to load this KML file.\n\n" + error.message);
                    setStatus( "Load failed", "status-error");
                    disablePlayback(true);
                    return;
                }
                //currentFlight = parser.parseKML(reader.result);
            }
            if (ext === "csv") {
                try {
                    const flight = parser.parseCSV(reader.result);
                    currentFlight = flight;
                }
                catch (error) {
                    console.error(error);
                    alert( "Unable to load this CSV file.\n\n" + error.message);
                    setStatus( "Load failed", "status-error");
                    disablePlayback(true);
                    return;
                }
                //currentFlight = parser.parseCSV(reader.result);
            }
            if (ext !== "kml" && ext !== "csv") {
                alert( "Unsupported file type: ." + ext);
                setStatus( "Load failed", "status-error");
                disablePlayback(true);
                return;
            }
            //--------------------------------------------------
            // Timeline
            //--------------------------------------------------
            timeline.min = 0;
            timeline.max = animation.getSampleCount() - 1;
            timeline.value = 0;
            //--------------------------------------------------
            // Enable playback controls
            //--------------------------------------------------
            disablePlayback(false);
            animation.loop = false;
            loopButton.textContent = "Loop";
            loopButton.classList.remove("active");
            //--------------------------------------------------
            // Animation Engine
            //--------------------------------------------------
            if (animation) {
                animation.loadFlight( currentFlight);
                updateFlightStatistics( currentFlight);
                graph.setFlight(animation.getSamples());
                // Set timeline range AFTER the flight samples exist:
                timeline.min = 0;
                timeline.max = animation.getSampleCount() - 1;
                timeline.value = 0;
            }
            else {
                // Part 1 compatibility
                updateInfoPanel( currentFlight.points[0], 0);
                mapView.moveAircraft( currentFlight.points[0]);
                mapView.updateTrail(0);
            }
            // Draw Map
            mapView.loadFlight(currentFlight);
            // Export Renderer
            if (mapExportRenderer) {
                // BUG? mapExportRenderer.setRoute( currentFlight.points);
                mapExportRenderer.setRoute(mapView.unwrappedRoute);
                mapExportRenderer.setFlightName(currentFlight.name); 
            }
            console.log( "Export route:", mapExportRenderer.route.length);
            // Status
            setStatus(
                `${currentFlight.count} points loaded`,
                "status-ready"
            );
        }
        catch (err) {
            console.error(err);
            alert(err.message);
            setStatus( "Load failed", "status-error");
            disablePlayback(true);
        }
    };
    reader.readAsText(file);
}
function headingText(h) {
    const dirs = [
        "N","NE","E","SE",
        "S","SW","W","NW"
    ];
    const idx = Math.round(h / 45) % 8;
    return `${Math.round(h)}° ${dirs[idx]}`;
}
//==========================================================
// Information Panel
//==========================================================
function updateInfoPanel(point, index) {
    if (!currentFlight) return;
    pointNumber.textContent =
    `${point.sourceIndex + 1} / ${currentFlight.points.length}`;
    flightTime.textContent = Utils.formatTime(point.time);
    altitude.textContent = Utils.formatAltitude(point.alt);
    latitude.textContent = Utils.formatCoordinate(point.lat);
    longitude.textContent = Utils.formatCoordinate(point.lon);
    flightName.textContent = currentFlight.name || "-";
    //------------------------------------------------------
    // Heading / Speed
    //------------------------------------------------------
    heading.textContent = headingText(point.heading);
    speedDisplay.textContent = Utils.formatSpeed(point.speed);
}
//==========================================================
// Status
//==========================================================
function setStatus(text, cssClass = "status-ready") {
    statusText.textContent = text;
    statusText.className = cssClass;
}
//==========================================================
// Enable / Disable Playback Controls
//==========================================================
function disablePlayback(disabled) {
    btnPlay.disabled = disabled;
    btnPause.disabled = disabled;
    btnRestart.disabled = disabled;
    timeline.disabled = disabled;
    speedSelect.disabled = disabled;
}
//==========================================================
// Animation Callbacks
//==========================================================
function onAnimationFrame(point, index) {
    onAnimationFrame.previousLon = point.lon;
    // Update aircraft
    mapView.moveAircraft(point);
    // Grow trail
    mapView.updateTrail(point.sourceIndex);
    // Rotate aircraft
    mapView.rotateAircraft(point.heading);
    // Timeline
    timeline.value = index;
    // Information
    updateInfoPanel(point, index);
    graph.updateCursor(index);
    // Export Renderer
    if (mapExportRenderer) {
        mapExportRenderer.drawFrame({
            point: point
        });
    }
    //graph.currentSample = index;
}
function onAnimationFinished() {
    setStatus(
        "Playback finished",
        "status-ready"
    );
}
//==========================================================
// Animation Started
//==========================================================
function onAnimationStarted() {
    setStatus(
        "Playing",
        "status-playing"
    );
}
//==========================================================
// Animation Paused
//==========================================================
function onAnimationPaused() {
    setStatus(
        "Paused",
        "status-paused"
    );
}
//==========================================================
// Animation Restarted
//==========================================================
function onAnimationRestarted() {
    timeline.value = 0;
    setStatus(
        "Ready",
        "status-ready"
    );
}
//==========================================================
// Register Callbacks
//==========================================================
function connectAnimationCallbacks() {
    if (!animation)
        return;
    animation.onFrame = onAnimationFrame;
    animation.onFinished = () => {
    // Export finished
    if (exporting) {
        if (mapExportRenderer.recording) { mapExportRenderer.stopRecording(); }
        animation.loop = wasLooping;
        exporting = false;
        exportStatus.textContent = "";
        exportStatus.classList.remove( "recording");
        exportButton.textContent = "Export Video";
        return;
    }
    // Normal Loop behavior
    if (!animation.loop) return;
    animation.currentFrame = animation.playStart;
    animation.play(); };
    animation.onStarted = onAnimationStarted;
    animation.onPaused = onAnimationPaused;
    animation.onRestarted = onAnimationRestarted;
}
function haversineNM( lat1, lon1, lat2, lon2) {
    const R = 3440.065;      // nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R *
        Math.atan2( Math.sqrt(a), Math.sqrt(1 - a));
}
function formatFlightTime(date) {
    return date.toLocaleString(
        [],
        {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    );
}
function updateFlightStatistics( flight) {
    if ( !flight || flight.points.length < 2)
        return;
    //------------------------------------------
    // Takeoff / Landing
    //------------------------------------------
    const takeoff = flight.points[0].time;
    const landing =
        flight.points[ flight.points.length - 1 ].time;
    takeoffDisplay.textContent = formatFlightTime(takeoff);
    landingDisplay.textContent = formatFlightTime(landing);
    //------------------------------------------
    // Duration
    //------------------------------------------
    const seconds =
        Math.round( (landing - takeoff) / 1000);
    const hours =
        Math.floor( seconds / 3600);
    const minutes =
        Math.floor( (seconds % 3600) / 60);
    durationDisplay.textContent =
        hours + "h" + minutes + "m";
    //------------------------------------------
    // Distance
    //------------------------------------------
    let total = 0;
    for ( let i = 1; i < flight.points.length; i++) {
        const a = flight.points[i - 1];
        const b = flight.points[i];
        total +=
            haversineNM( a.lat, a.lon, b.lat, b.lon);
    }
    distanceDisplay.textContent = total.toFixed(0) + " NM";
    const averageSpeed = total / (seconds / 3600);
    averageSpeedDisplay.textContent = averageSpeed.toFixed(0) + " kt";
}
function formatFocusTime(sampleIndex) {
    if (!animation || !animation.samples || !animation.samples[sampleIndex])
        return "-";
    const value = animation.samples[sampleIndex][SAMPLE.TIME];
    if (!(value instanceof Date))
        return "-";
    return value.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}
function updateFocusStatus(start, end) {
    const active = end !== null && end > start;
    if (!active) {
        focusStatusText.textContent = "Full Flight";
        focusStatus.classList.remove("active");
        resetFocusBtn.disabled = true;
        return;
    }
    focusStatusText.textContent =
        formatFocusTime(start) + " → " + formatFocusTime(end);
    focusStatus.classList.add("active");
    resetFocusBtn.disabled = false;
}
function exportFocusedFlight() {
    const firstSample =
        graph.focusStart;
    const lastSample =
        (graph.focusEnd === null)
            ? animation.samples.length - 1
            : graph.focusEnd;
    const firstPoint = animation.samples[firstSample][SAMPLE.SOURCE];
    const lastPoint = animation.samples[lastSample][SAMPLE.SOURCE];
    const selected =
        currentFlight.points.slice(
            firstPoint,
            lastPoint + 1
        );
    const focusedFlight = {
        name:
            (currentFlight.name || "Flight") +
            " (Focused)",
        count:
            selected.length,
        startTime:
            selected[0].time,
        endTime:
            selected[selected.length - 1].time,
        points:
            selected
    };
    const kml =
        KmlWriter.write(focusedFlight);
    downloadText(
        focusedFlight.name + ".kml",
        kml
    );
}
function downloadText(filename, text) {
    const blob =
        new Blob(
            [text],
            { type: "application/vnd.google-earth.kml+xml" }
        );
    const url =
        URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 
// Final Initialization
window.addEventListener("load", () => {
    if (animation) { connectAnimationCallbacks(); };
});
console.log("app.js loaded.");

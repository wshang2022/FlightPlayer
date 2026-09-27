class MapExportRenderer {
    constructor(options = {}) {
        this.width = options.width ?? 1280;
        this.height = options.height ?? 720;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.recording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.route = [];
        this.bounds = null;
        this.aircraftImage = new Image();
        this.aircraftReady = false;
        this.aircraftImage.onload =
            () => { this.aircraftReady = true; 
                    // console.log( "Export aircraft image loaded:", this.aircraftImage.src); 
            };
        this.aircraftImage.onerror =
                error => {
                    console.error( "Export aircraft image FAILED to load:", this.aircraftImage.src, error
                    );
                };
        this.aircraftImage.src = "images/aircraft.svg";
        this.mapImage = null;
        this.flightName = "Flight";
        this.displayLon = null;
    }

    setFlightName(name) {
        this.flightName = name || "Flight";
    }

    // Set captured map image
    setMapImage(canvas, bounds = null) {
        this.mapImage = canvas;
        this.mapBounds = bounds;
    }
    // Configure flight route
    setRoute(route) {
        this.displayLon = null;
        // Accept either [lat, lon] arrays from mapView or { lat, lon } objects:
        this.route = (route || []).map(p => {
            if (Array.isArray(p)) {
                return { lat: p[0], lon: p[1] };
            }
            return { lat: p.lat, lon: p.lon };
        });
        this.bounds = this.calculateBounds(this.route);
    }
    //--------------------------------------------------
    // Calculate geographic bounds
    //--------------------------------------------------
    calculateBounds(route) {
        if (!route || route.length === 0)
            return null;
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLon = Infinity;
        let maxLon = -Infinity;
        for (const point of route) {
            if (point.lat < minLat) minLat = point.lat;
            if (point.lat > maxLat) maxLat = point.lat;
            if (point.lon < minLon) minLon = point.lon;
            if (point.lon > maxLon) maxLon = point.lon;
        }
        return {
            minLat,
            maxLat,
            minLon,
            maxLon
        };
    }
    // Convert geographic point to canvas position
    project(point) {
        if (!point) return null;
        // Exact Web Mercator alignment when map image is present:
        if (this.mapBounds) {
            const mercatorY = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
            const north = this.mapBounds.getNorth();
            const south = this.mapBounds.getSouth();
            const west = this.mapBounds.getWest();
            const east = this.mapBounds.getEast();
            const x = ((point.lon - west) / (east - west)) * this.width;
            const y = ((mercatorY(north) - mercatorY(point.lat)) / (mercatorY(north) - mercatorY(south))) * this.height;
            return { x, y };
        }
        // Fallback if no map background:
        if (!this.bounds) return null;
        const padding = 50;
        const drawWidth = this.width - padding * 2;
        const drawHeight = this.height - padding * 2;
        const lonRange = (this.bounds.maxLon - this.bounds.minLon) || 1;
        const latRange = (this.bounds.maxLat - this.bounds.minLat) || 1;
        const x = padding + ((point.lon - this.bounds.minLon) / lonRange) * drawWidth;
        const y = padding + (1 - (point.lat - this.bounds.minLat) / latRange) * drawHeight;
        return { x, y };
    }
    //--------------------------------------------------
    // Draw one export frame
    //--------------------------------------------------
    drawFrame(frame) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        // Background
        if (this.mapImage) {
            ctx.drawImage( this.mapImage, 0, 0, this.width, this.height);
        } else {
        // Fallback background
            ctx.fillStyle = "#1f2937";
            ctx.fillRect( 0, 0, this.width, this.height);
            // Grid
            this.drawGrid();
        }
        // Flight route
        this.drawRoute();
        // Start / finish
        this.drawEndpoints();
        // Aircraft
        if (frame?.point) {
            this.drawAircraft( frame.point);
        }
    }
    //--------------------------------------------------
    // Draw background grid
    //--------------------------------------------------
    drawGrid() {
        const ctx =
            this.ctx;
        const spacing = 100;
        ctx.strokeStyle =
            "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        for ( let x = 0; x <= this.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo( x, this.height);
            ctx.stroke();
        }
        for ( let y = 0; y <= this.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo( this.width, y);
            ctx.stroke();
        }
    }
    //--------------------------------------------------
    // Draw flight route
    //--------------------------------------------------
    drawRoute() {
        if ( !this.route || this.route.length < 2) return;
        const ctx = this.ctx;
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        for ( let i = 0; i < this.route.length; i++) {
            const point = this.project( this.route[i]);
            if (!point) continue;
            if (i === 0) {
                ctx.moveTo( point.x, point.y);
            } else {
                ctx.lineTo( point.x, point.y);
            }
        }
        ctx.stroke();
    }
    // Draw start / finish markers
    drawEndpoints() {
        if ( !this.route || this.route.length === 0) return;
        this.drawPoint( this.route[0], "#22c55e");
        this.drawPoint( this.route[ this.route.length - 1 ], "#ef4444");
    }
    // Draw point
    drawPoint( point, color) {
        const projected = this.project(point);
        if (!projected) return;
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc( projected.x, projected.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    // Draw aircraft
    drawAircraft(point) {
        if (!point) return;
        // Keep aircraft longitude continuously unwrapped across Date Line:
        const lon = point.lon;
        if (this.displayLon === null) {
            this.displayLon = lon;
        } else {
            const delta = lon - this.displayLon;
            if (delta < -180) this.displayLon = lon + 360;
            else if (delta > 180) this.displayLon = lon - 360;
            else this.displayLon = lon;
        }
        const projected = this.project({ lat: point.lat, lon: this.displayLon });
        //const projected = this.project(point);
        if (!projected) return;
        const ctx = this.ctx;
        const size = 40;
        //--------------------------------------------------
        // Heading
        //--------------------------------------------------
        const heading = Number.isFinite(point.heading) ? point.heading : 0;
        const radians = heading * Math.PI / 180;
        //--------------------------------------------------
        // Draw
        //--------------------------------------------------
        ctx.save();
        ctx.translate( projected.x, projected.y);
        ctx.rotate(radians);
        // SVG aircraft
        if (this.aircraftReady) {
            ctx.drawImage(
                this.aircraftImage,
                -size / 2,
                -size / 2,
                size,
                size
            );
        } else {
            // Temporary fallback
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo( 0, -12);
            ctx.lineTo( 7, 10);
            ctx.lineTo( 0, 6);
            ctx.lineTo( -7, 10);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    // Recording state
    start() {
        this.recording = true;
    }
    stop() {
        this.recording = false;
    }
    getCanvas() {
        return this.canvas;
    }
    getWidth() {
        return this.width;
    }
    getHeight() {
        return this.height;
    }
    //--------------------------------------------------
    // Start recording
    //--------------------------------------------------
    startRecording() {
        if (this.recording) return;
        const stream = this.canvas.captureStream(30); // 30 is framerate
        this.recordedChunks = [];
        // this.mediaRecorder = new MediaRecorder( stream, { mimeType: "video/webm" });
        const mimeType = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
            "video/mp4"
        ].find(type => MediaRecorder.isTypeSupported(type)) || "";
        this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        this.mediaRecorder.ondataavailable =
            event => {
                if ( event.data && event.data.size > 0) {
                    this.recordedChunks.push( event.data);
                }
            };
        this.mediaRecorder.onstop =
            () => { this.saveRecording(); };
        this.mediaRecorder.start();
        this.recording = true;
        // console.log( "Recording started");
    }
    //--------------------------------------------------
    // Stop recording
    //--------------------------------------------------
    stopRecording() {
        if (!this.recording) return;
        this.mediaRecorder.stop();
        this.recording = false;
        // console.log( "Recording stopped");
    }
//--------------------------------------------------
// Save recording
//--------------------------------------------------
    saveRecording() {
        if ( this.recordedChunks.length === 0) return;
        const blob = new Blob( this.recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Clean name to prevent invalid filename characters:
        const safeName = (this.flightName || "FlightPlayer")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .trim();
        link.download = `${safeName}.webm`;

        document.body.appendChild( link);
        link.click();
        document.body.removeChild( link);
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
    }
}

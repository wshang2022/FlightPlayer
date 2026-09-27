//--------------------------------------------------
// graph.js
//--------------------------------------------------
class FlightGraph {
    constructor(svgId) {
        this.svg =
            document.getElementById(svgId);
        this.width = 0;
        this.height = 0;
        this.margin = {
            left: 55,
            right: 60,
            top: 15,
            bottom: 25
        };
        this.samples = [];
        this.cursor = null;
        this.onSeek = null;
        // this.svg.addEventListener( "click", e => this.onClick(e));
        window.addEventListener( "mousemove", e => this.onMouseMove(e));
        window.addEventListener( "mouseup", this.onMouseUp.bind(this));
        // Mouse event related to Focus
        this.svg.addEventListener( "mousedown", e => this.onMouseDown(e));
        this.svg.addEventListener( "wheel", e => this.onWheel(e), { passive: false });
        this.svg.addEventListener( "mousemove", e => this.onMouseHover(e));
        this.svg.addEventListener( "mouseleave", () => { this.tooltip.style.display = "none"; });
        this.svg.addEventListener( "dblclick", () => this.resetFocus());
        this.onDragStart = null;
        this.onDragEnd = null;
        this.currentSample = 0;
        this.wheelStep = 500;    // Default until a flight is loaded
        this.tooltip = document.getElementById( "graphTooltip");
        // Focus related
        this.focusEnd = null;     // null means entire flight
        this.dragging = false;
        this.dragStartX = 0;
        this.dragCurrentX = 0;
        this.focusStart = 0;
        this.focusEnd = null;
        this.onFocus = null;
        // Persistent drag-selection box
        this.selectionRect = this.createSvgElement("rect");
        this.selectionRect.setAttribute("fill", "#3399ff");
        this.selectionRect.setAttribute("fill-opacity", "0.20");
        this.selectionRect.setAttribute("pointer-events", "none"); // <-- Prevents box from blocking mouse drag/hover
        this.selectionRect.style.display = "none";
        this.svg.appendChild(this.selectionRect);
        console.log("graph.js loaded");
    }
    onClick(event) {
        this.seekFromMouse(event);
    }
    setFlight(samples) {
        this.samples = samples || [];
// Adaptive mouse wheel step
        this.wheelStep =
            Math.max(
                100,
                Math.floor( this.samples.length / 1000)
            );
        // Always start a new flight fully zoomed out
        this.focusStart = 0;
        this.focusEnd = null;
        this.draw();
    }
    clear() {
        while (this.svg.firstChild)
            this.svg.removeChild( this.svg.firstChild);
    }
    createSvgElement(name) {
        return document.createElementNS(
            "http://www.w3.org/2000/svg",
            name
        );
    }
    buildPath(yFunction) {
        const firstSample = this.focusStart;
        const lastSample = (this.focusEnd === null) ? this.samples.length - 1 : this.focusEnd;
        const visibleCount = lastSample - firstSample + 1;
        const maxPoints = 1000;
        const step = Math.max( 1, Math.floor( visibleCount / maxPoints));
        const totalPoints = Math.ceil( visibleCount / step);
        let d = "";
        let first = true;
        let plotIndex = 0;
        // console.log({ samples: this.samples.length, focusStart: this.focusStart, focusEnd: this.focusEnd });
        for ( let i = firstSample; i <= lastSample; i += step) {
            const sample = this.samples[i];
            if (!sample) continue;
            const x = this.xFromIndex( plotIndex, totalPoints);
            const y = yFunction(sample);
            if (first) {
                d += `M ${x} ${y}`;
                first = false;
            }
            else {
                d += ` L ${x} ${y}`;
            }
            plotIndex++;
        }
        return d;
    }
    visiblePointCount() {
        if (this.focusEnd === null) return this.samples.length;
        return this.focusEnd - this.focusStart + 1;
    }
    focus(start,end){
        // this.focusStart = Math.min(start,end);
        // this.focusEnd = Math.max(start,end);
        if (!this.samples || this.samples.length === 0) return;
        this.focusStart = Math.max(
            0,
            Math.min(start, end)
        );
        this.focusEnd = Math.min(
            this.samples.length - 1,
            Math.max(start, end)
        );
        this.draw();
        if (this.onFocus) {
            this.onFocus( this.samples, this.focusStart, this.focusEnd);
        }
    }
    drawPath(pathData, color) {
        const path = this.createSvgElement( "path");
        path.setAttribute( "d", pathData);
        path.setAttribute( "fill", "none");
        path.setAttribute( "stroke", color);
        path.setAttribute( "stroke-width", 2);
        this.svg.appendChild( path);
    }
    drawSpeedLabels() {
        const x = this.getPlotRight() + 8;
        for ( let speed = 0; speed <= this.maxSpeed; speed += 200) {
            const y = this.yFromSpeed(speed);
            // Tick mark
            const tick = this.createSvgElement("line");
            tick.setAttribute( "x1", this.getPlotRight());
            tick.setAttribute( "x2", this.getPlotRight() + 5);
            tick.setAttribute( "y1", y);
            tick.setAttribute( "y2", y);
            tick.setAttribute( "stroke", "#666");
            this.svg.appendChild(tick);
            // Label
            const text = this.createSvgElement("text");
            text.setAttribute( "x", x + 4);
            text.setAttribute( "y", y + 4);
            text.setAttribute( "font-size", "11");
            text.setAttribute( "text-anchor", "start");
            text.setAttribute( "fill", this.textColor);
            text.textContent = speed;
            this.svg.appendChild(text);
        }
    }
    drawSpeedTitle() {
        const text = this.createSvgElement("text");
        text.setAttribute( "x", this.getPlotRight());
        text.setAttribute( "y", 12);
        text.setAttribute( "font-size", "13");
        text.setAttribute( "font-weight", "bold");
        text.setAttribute( "text-anchor", "end");
        text.textContent = "Speed (kt)";
        text.setAttribute( "fill", this.textColor);
        this.svg.appendChild(text);
    }
    drawSpeed() {
        const d =
            this.buildPath( sample => this.yFromSpeed( sample[SAMPLE.SPEED]));
        this.drawPath( d, "#ff8c00");
    }
    getPlotLeft() {
        // KEEP THIS return this.getPlotLeft();
        return this.margin.left;
    }
    getPlotRight() {
        return this.width - this.margin.right;
    }
    getPlotTop() {
        return this.margin.top;
    }
    getPlotBottom() {
        return this.height - this.margin.bottom;
    }
    getPlotWidth() {
        return this.getPlotRight() - this.getPlotLeft();
    }
    getPlotHeight() {
        return this.getPlotBottom() - this.getPlotTop();
    }
    xFromFraction(fraction) {
        return ( this.getPlotLeft() + fraction * this.getPlotWidth());
    }
    xFromIndex(plotIndex, totalPoints) {
        if (totalPoints <= 1) return this.getPlotLeft();
        return (
            this.getPlotLeft() + this.getPlotWidth() * plotIndex / (totalPoints - 1)
        );
    }
    yFromSpeed(speed) {
        return (
            this.getPlotTop() +
                this.getPlotHeight() * ( 1 - speed / this.maxSpeed)
        );
    }
    yFromAltitude(altitude) {
        return (
            this.getPlotTop() +
                this.getPlotHeight() * ( 1 - altitude / this.maxAltitude)
        );
    }
    xToSample(x) {
        const left = this.getPlotLeft();
        const right = this.getPlotRight();
        const t = (x - left) / (right - left);
        return Math.round( t * (this.samples.length - 1));
    }
    draw() {
        // Clear previous drawing
        this.svg.replaceChildren();
        const css = getComputedStyle( document.body);
        this.textColor = css.getPropertyValue( "--text").trim();
        this.gridColor = css.getPropertyValue( "--grid").trim();
        this.cursorColor = css.getPropertyValue( "--cursor").trim();
        if ( !this.samples || this.samples.length === 0) return;
        this.width = this.svg.clientWidth;
        this.height = this.svg.clientHeight;
        this.clear();
        // Determine altitude scale
        this.maxAltitude = 0;
        for (const s of this.samples) {
            if (s[2] > this.maxAltitude) this.maxAltitude = s[2];
        }
        this.maxAltitude =
            Math.ceil( this.maxAltitude / 10000) * 10000 || 10000;
        this.maxSpeed = 0;
         for (const s of this.samples) {
            if (s[4] > this.maxSpeed) this.maxSpeed = s[4];
        } 
        this.maxSpeed = Math.ceil( this.maxSpeed / 100) * 100 || 100;
        this.drawGrid();
        this.drawAxes();
        this.drawAltitude();
        this.drawXAxisLabels();
        this.drawYAxisLabels();
        this.drawSpeedLabels();
        this.drawSpeed(); 
        this.drawTitle();
        this.drawSpeedTitle();
        this.drawCursor( this.currentSample !== undefined ? this.currentSample : 0);
        // Focus visualization
        if (this.focusEnd !== null && this.focusEnd > this.focusStart) {
            const left =
                this.xFromIndex(0, this.visiblePointCount());
            const right =
                this.xFromIndex(
                    this.visiblePointCount() - 1,
                    this.visiblePointCount()
                );
            const focusBand = this.createSvgElement("rect");
            focusBand.setAttribute("x", left);
            focusBand.setAttribute("y", this.margin.top);
            focusBand.setAttribute("width", right - left);
            focusBand.setAttribute(
                "height",
                this.height - this.margin.top - this.margin.bottom
            );
            focusBand.setAttribute("class", "graph-focus-band");
            this.svg.appendChild(focusBand);
            const focusLabel = this.createSvgElement("text");
            focusLabel.setAttribute("x", right - 6);
            focusLabel.setAttribute("y", this.margin.top + 13);
            focusLabel.setAttribute("text-anchor", "end");
            focusLabel.setAttribute("class", "graph-focus-label");
            focusLabel.textContent = "FOCUS";
            this.svg.appendChild(focusLabel);
        }
        if (this.selectionRect) { this.svg.appendChild(this.selectionRect);}
    }
    redraw() {
        if ( !this.samples || this.samples.length === 0)
            return;
        this.draw();
    }
    drawAxes() {
        const x0 = this.getPlotLeft();
        const y0 = this.getPlotBottom();
        const x1 = this.width - this.margin.right;
        const y1 = this.margin.top;
        // X axis
        let line = this.createSvgElement( "line");
        line.setAttribute( "x1", x0);
        line.setAttribute( "y1", y0);
        line.setAttribute( "x2", x1);
        line.setAttribute( "y2", y0);
        line.setAttribute( "stroke", "#444");
        this.svg.appendChild( line);
        // Y axis
        line = this.createSvgElement( "line");
        line.setAttribute( "x1", x0);
        line.setAttribute( "y1", y0);
        line.setAttribute( "x2", x0);
        line.setAttribute( "y2", y1);
        line.setAttribute( "stroke", "#444");
        this.svg.appendChild( line);
    }
    drawAltitude() {
        const d =
            this.buildPath(
                sample =>
                    this.yFromAltitude( sample[SAMPLE.ALT])
            );
        this.drawPath( d, "#2f7cff");
    }
    drawGrid() {
        const left = this.getPlotLeft();
        const right = this.getPlotRight();
        const top = this.getPlotTop();
        const bottom = this.getPlotBottom();
        // Horizontal grid
        for ( let alt = 0; alt <= this.maxAltitude; alt += 5000) {
            const y = top + (1 - alt / this.maxAltitude) * (bottom - top);
            const line = this.createSvgElement( "line");
            line.setAttribute( "x1", left);
            line.setAttribute( "x2", right);
            line.setAttribute( "y1", y);
            line.setAttribute( "y2", y);
            line.setAttribute( "stroke", "#e8e8e8");
            this.svg.appendChild( line);
        }
        // Vertical grid
        for ( let i = 0; i <= 6; i++) {
            const x = left + i * (right - left) / 6;
            const line = this.createSvgElement( "line");
            line.setAttribute( "x1", x);
            line.setAttribute( "x2", x);
            line.setAttribute( "y1", top);
            line.setAttribute( "y2", bottom);
            line.setAttribute( "stroke", "#eeeeee");
            this.svg.appendChild( line);
        }
    }
    drawYAxisLabels() {
        const left = this.getPlotLeft() - 8;
        const top = this.getPlotTop();
        const bottom = this.getPlotBottom();
        for ( let alt = 0; alt <= this.maxAltitude; alt += 5000) {
            const y = top + (1 - alt / this.maxAltitude) * (bottom - top);
            const text = this.createSvgElement( "text");
            text.setAttribute( "x", left);
            text.setAttribute( "y", y + 4);
            text.setAttribute( "text-anchor", "end");
            text.setAttribute( "font-size", "11");
            text.setAttribute( "fill", this.textColor);
            text.textContent = alt;
            this.svg.appendChild( text);
        }
    }
    drawXAxisLabels() {
        const bottom = this.getPlotBottom() + 18;
        if (!this.samples || this.samples.length === 0)
            return;
        //--------------------------------------------------
        // Visible sample range
        //--------------------------------------------------
        const first = this.focusStart;
        const last = (this.focusEnd === null) ? this.samples.length - 1 : this.focusEnd;
        const visibleCount = last - first + 1;
        if (visibleCount <= 0) return;
        //--------------------------------------------------
        // Determine visible time span
        //--------------------------------------------------
        const firstSample = this.samples[first];
        const lastSample = this.samples[last];
        if (!firstSample || !lastSample) return;
        const firstTime = firstSample[SAMPLE.TIME];
        const lastTime = lastSample[SAMPLE.TIME];
        if (!(firstTime instanceof Date) || !(lastTime instanceof Date)) { return; }
        const duration = Math.abs(lastTime.getTime() - firstTime.getTime());
        //--------------------------------------------------
        // Label precision
        // Long range  -> HH:MM
        // Short range -> HH:MM:SS
        //--------------------------------------------------
        const showSeconds = duration < 30 * 60 * 1000;
        //--------------------------------------------------
        // Adaptive number of labels
        //--------------------------------------------------
        let count = 6;
        if (visibleCount < 20)
            count = Math.min(4, visibleCount - 1);
        if (count < 1)
            return;
        //--------------------------------------------------
        // Draw labels
        //--------------------------------------------------
        for (let i = 0; i <= count; i++) {
            const plotIndex =
                Math.round( i * (visibleCount - 1) / count);
            const sampleIndex = first + plotIndex;
            const sample = this.samples[sampleIndex];
            if (!sample) continue;
            const d = sample[SAMPLE.TIME];
            if (!(d instanceof Date))
                continue;
            //--------------------------------------------------
            // Format time
            //--------------------------------------------------
            const label =
                d.toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: showSeconds ? "2-digit" : undefined,
                        hour12: false
                    }
                );
            //--------------------------------------------------
            // X position
            //--------------------------------------------------
            const x = this.xFromIndex( plotIndex, visibleCount);
            //--------------------------------------------------
            // Tick mark
            //--------------------------------------------------
            const tick = this.createSvgElement("line");
            tick.setAttribute("x1", x);
            tick.setAttribute("x2", x);
            tick.setAttribute( "y1", this.getPlotBottom());
            tick.setAttribute( "y2", this.getPlotBottom() + 5);
            tick.setAttribute( "stroke", this.gridColor);
            this.svg.appendChild(tick);
            //--------------------------------------------------
            // Label
            //--------------------------------------------------
            const text =
                this.createSvgElement("text");
            text.setAttribute("x", x);
            text.setAttribute("y", bottom);
            text.setAttribute( "text-anchor", "middle");
            text.setAttribute( "font-size", "11");
            text.setAttribute( "fill", this.textColor);
            text.textContent = label;
            this.svg.appendChild(text);
        }
    }
    drawTitle() {
        const text = this.createSvgElement( "text");
        text.setAttribute( "x", this.getPlotLeft());
        text.setAttribute( "y", 12);
        text.setAttribute( "font-size", "13");
        text.setAttribute( "font-weight", "bold");
        text.textContent = "Altitude (ft)";
        text.setAttribute( "fill", this.textColor);
        this.svg.appendChild( text);
    }
    sampleIndexToX(sampleIndex) {
        if (!this.samples || this.samples.length === 0)
            return this.getPlotLeft();
        const first = this.focusStart;
        const last =
            (this.focusEnd === null)
                ? this.samples.length - 1
                : this.focusEnd;
        const clamped =
            Math.max(first, Math.min(sampleIndex, last));
        const visibleCount = last - first + 1;
        const plotIndex = clamped - first;
        return this.xFromIndex(plotIndex, visibleCount);
    }
    drawCursor(sampleIndex) {
        if (!this.samples || this.samples.length === 0)
            return;
        const x = this.sampleIndexToX(sampleIndex);
        const top = this.getPlotTop();
        const bottom = this.getPlotBottom();
        const size = 5;
        const group = this.createSvgElement("g");
        group.setAttribute("class", "graph-cursor");
        const line = this.createSvgElement("line");
        line.setAttribute("x1", x);
        line.setAttribute("x2", x);
        line.setAttribute("y1", top);
        line.setAttribute("y2", bottom);
        line.setAttribute("stroke", this.cursorColor);
        line.setAttribute("stroke-width", 2);
        line.setAttribute("stroke-dasharray", "4 4");
        group.appendChild(line);
        // Small triangular markers make the cursor easy to spot.
        const topMarker = this.createSvgElement("polygon");
        topMarker.setAttribute(
            "points",
            `${x},${top} ${x-size},${top-size} ${x+size},${top-size}`
        );
        topMarker.setAttribute("class", "graph-cursor-marker");
        group.appendChild(topMarker);
        const bottomMarker = this.createSvgElement("polygon");
        bottomMarker.setAttribute(
            "points",
            `${x},${bottom} ${x-size},${bottom+size} ${x+size},${bottom+size}`
        );
        bottomMarker.setAttribute("class", "graph-cursor-marker");
        group.appendChild(bottomMarker);
        this.svg.appendChild(group);
        this.cursor = line;
        this.cursorTopMarker = topMarker;
        this.cursorBottomMarker = bottomMarker;
    }
    updateCursor(sampleIndex) {
        this.currentSample = sampleIndex;
        if (!this.cursor)
            return;
        const x = this.sampleIndexToX(sampleIndex);
        const top = this.getPlotTop();
        const bottom = this.getPlotBottom();
        const size = 5;
        this.cursor.setAttribute("x1", x);
        this.cursor.setAttribute("x2", x);
        this.cursor.setAttribute("y1", top);
        this.cursor.setAttribute("y2", bottom);
        if (this.cursorTopMarker) {
            this.cursorTopMarker.setAttribute(
                "points",
                `${x},${top} ${x-size},${top-size} ${x+size},${top-size}`
            );
        }
        if (this.cursorBottomMarker) {
            this.cursorBottomMarker.setAttribute(
                "points",
                `${x},${bottom} ${x-size},${bottom+size} ${x+size},${bottom+size}`
            );
        }
    }
    fractionFromMouseX(mouseX) {
        let fraction = ( mouseX - this.getPlotLeft()) / this.getPlotWidth();
        if (fraction < 0) fraction = 0;
        if (fraction > 1) fraction = 1;
        return fraction;
    }
    sampleIndexFromFraction(fraction) {
        if (!this.samples || this.samples.length === 0)
            return 0;
        const first = this.focusStart;
        const last =
            (this.focusEnd === null) ? this.samples.length - 1 : this.focusEnd;
        const visibleCount = last - first + 1;
        return first +
            Math.round( fraction * (visibleCount - 1));
    }
    onMouseDown(event) {
        event.preventDefault();
        this.dragging = true;
        if (event.shiftKey) {
            const rect = this.svg.getBoundingClientRect();
            this.dragStartX = event.clientX - rect.left;
            this.dragCurrentX = this.dragStartX;
            this.selectionRect.setAttribute("x", this.dragStartX);
            this.selectionRect.setAttribute("y", this.margin.top);
            this.selectionRect.setAttribute("width", 0);
            this.selectionRect.setAttribute("height", this.getPlotHeight());
            this.selectionRect.style.display = "block";
            return;
        }
        if (this.onDragStart)
            this.onDragStart();
        this.seekFromMouse(event);
    }
    onMouseMove(event) {
        if (!this.dragging) return;
        // SHIFT = Focus selection
        if (event.shiftKey) {
            const rect = this.svg.getBoundingClientRect();
            this.dragCurrentX = event.clientX - rect.left;
            const left = Math.max(this.getPlotLeft(), Math.min(this.dragStartX, this.dragCurrentX));
            const right = Math.min(this.getPlotRight(), Math.max(this.dragStartX, this.dragCurrentX));
            this.selectionRect.setAttribute("x", left);
            this.selectionRect.setAttribute("width", Math.max(0, right - left));
            return; // No this.draw() call!
        }
        // Normal drag = Seek
        this.seekFromMouse(event);
    }
    onMouseUp(event) {
        if (!this.dragging) return;
        this.dragging = false;
        if (event.shiftKey) {
            this.selectionRect.style.display = "none";
            
            // Ignore accidental clicks / micro-drags
            if (Math.abs(this.dragCurrentX - this.dragStartX) > 5) {
                const sampleStart = this.sampleIndexFromFraction(this.fractionFromMouseX(this.dragStartX));
                const sampleEnd = this.sampleIndexFromFraction(this.fractionFromMouseX(this.dragCurrentX));
                this.focus(sampleStart, sampleEnd);
            }
            return;
        }
        if (this.onDragEnd) this.onDragEnd();
    }
    onMouseHover(event) {
        const rect =
            this.svg.getBoundingClientRect();
        const mouseX =
            event.clientX -
            rect.left;
        // Ignore left/right margins
        if ( mouseX < this.getPlotLeft() || mouseX > this.getPlotRight()) {
            this.tooltip.style.display =
                "none";
            return;
        }
        this.showTooltip(
            mouseX,
            event.clientX,
            event.clientY
        );
    }
    showTooltip(mouseX, clientX, clientY) {
        if (!this.samples || this.samples.length === 0)
            return;
        if (!this.tooltip)
            return;
        //--------------------------------------------------
        // Determine the currently visible sample range
        //--------------------------------------------------
        const first = this.focusStart;
        const last =
            (this.focusEnd === null)
                ? this.samples.length - 1
                : this.focusEnd;
        const visibleCount = last - first + 1;
        if (visibleCount <= 0)
            return;
        //--------------------------------------------------
        // Convert mouse X position to sample index
        //--------------------------------------------------
        const plotLeft = this.getPlotLeft();
        const plotRight = this.getPlotRight();
        const plotWidth = plotRight - plotLeft;
        if (plotWidth <= 0)
            return;
        let fraction =
            (mouseX - plotLeft) / plotWidth;
        // Protect against small mouse-position rounding errors.
        fraction = Math.max(0, Math.min(1, fraction));
        const plotIndex =
            Math.round(
                fraction * (visibleCount - 1)
            );
        const sampleIndex =
            first + plotIndex;
        const sample =
            this.samples[sampleIndex];
        if (!sample)
            return;
        //--------------------------------------------------
        // Sample data
        //--------------------------------------------------
        const time = sample[SAMPLE.TIME];
        const altitude = sample[SAMPLE.ALT];
        const speed = sample[SAMPLE.SPEED];
        const heading = sample[SAMPLE.HEADING];
        //--------------------------------------------------
        // Formatting helpers
        //--------------------------------------------------
        const formatNumber = (value, digits = 0) => {
            if (
                value === undefined ||
                value === null ||
                !Number.isFinite(value)
            ) {
                return "-";
            }
            return Number(value).toLocaleString([], {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        };
        const formatTime = value => {
            if (!(value instanceof Date))
                return "-";
            return value.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            });
        };
        //--------------------------------------------------
        // Build tooltip
        //--------------------------------------------------
        this.tooltip.innerHTML = `
            <div class="graph-tooltip-row">
                <span class="graph-tooltip-label">TIME</span>
                <span>${formatTime(time)}</span>
            </div>
            <div class="graph-tooltip-row">
                <span class="graph-tooltip-label">ALT</span>
                <span>${formatNumber(altitude)} ft</span>
            </div>
            <div class="graph-tooltip-row">
                <span class="graph-tooltip-label">SPEED</span>
                <span>${formatNumber(speed)} kt</span>
            </div>
            <div class="graph-tooltip-row">
                <span class="graph-tooltip-label">HDG</span>
                <span>${formatNumber(heading)}°</span>
            </div>
        `;
        //--------------------------------------------------
        // Position tooltip
        //--------------------------------------------------
        this.tooltip.style.display = "block";
        const graphRect =
            this.svg.getBoundingClientRect();
        const tooltipRect =
            this.tooltip.getBoundingClientRect();
        let left =
            clientX -
            graphRect.left +
            12;
        let top =
            clientY -
            graphRect.top +
            12;
        //--------------------------------------------------
        // Keep tooltip inside graph
        //--------------------------------------------------
        if ( left + tooltipRect.width > graphRect.width) {
            left = clientX - graphRect.left - tooltipRect.width - 12;
        }
        if ( top + tooltipRect.height > graphRect.height
        ) {
            top = clientY - graphRect.top - tooltipRect.height - 12;
        }
        left = Math.max(4, left);
        top = Math.max(4, top);
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
    seekFromMouse(event) {
        const rect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        if ( mouseX < this.getPlotLeft() || mouseX > this.getPlotRight())
            return;
        const fraction = this.fractionFromMouseX( mouseX);
        const sampleIndex = this.sampleIndexFromFraction( fraction);
        if (this.onSeek) this.onSeek(sampleIndex);
    }
    onWheel(event) {
        event.preventDefault();
        const direction = -Math.sign(event.deltaY);
        //--------------------------------------------------
        // Wheel step
        //--------------------------------------------------
        let step = 500;          // Normal
        if (event.ctrlKey)
            step = 50;           // Fine
        if (event.shiftKey)
            step = 5000;         // Fast 
        this.currentSample += direction * step;
        this.currentSample =
            Math.max(
                0,
                Math.min( this.currentSample, this.samples.length - 1)
            );
        if (this.onSeek)
            this.onSeek( this.currentSample);
    }
    resetFocus() {
        this.focusStart = 0;
        this.focusEnd = null;
        this.draw();
        if (this.onFocus) {
            this.onFocus(
                this.samples,
                this.focusStart,
                this.samples.length - 1
                // this.focusEnd
            );
        }
    }
}

/*
==========================================================
FlightPlayer Lite 2.1
sampler.js
==========================================================
*/
"use strict";
const MAX_REASONABLE_SPEED = 700;

class FlightSampler {
    constructor(options = {}) {
        this.interval =
            options.interval ?? 0.1;     // seconds
        this.samples = [];
    }
    //------------------------------------------------------
    // Generate Samples
    //------------------------------------------------------
    generate(flight) {
        this.samples = [];
        if (!flight) return this.samples;
        if (flight.points.length < 2) return this.samples;
        const totalDuration =
            (flight.points[ flight.points.length - 1 ].time - flight.points[0].time) / 1000;
        //--------------------------------------------------
        // Process every segment
        //--------------------------------------------------
        for ( let i = 0; i < flight.points.length - 1; i++) {
            this.sampleSegment(
                flight.points[i],
                flight.points[i + 1],
                i,
                totalDuration,
                flight.points[0].time
            );
        }
        //--------------------------------------------------
        // Add final point
        //--------------------------------------------------
        this.appendFinalPoint(
            flight.points[
                flight.points.length - 1
            ],
            flight.points.length - 1,
            totalDuration,
            flight.points[0].time
        );
        console.log( "Generated", this.samples.length, "samples.");
        return this.samples;
    }
    //------------------------------------------------------
    // Sample One Flight Segment
    //------------------------------------------------------
    sampleSegment(
        p1,
        p2,
        sourceIndex,
        totalDuration,
        flightStart
    ) {
        const segmentSeconds = (p2.time - p1.time) / 1000;
        if (segmentSeconds <= 0) return;
        //--------------------------------------------------
        // Calculate heading once
        //--------------------------------------------------
        const heading =
            Utils.heading(
                p1.lat,
                p1.lon,
                p2.lat,
                p2.lon
            );
        //--------------------------------------------------
        // Calculate speed once
        //--------------------------------------------------
        const distance =
            Utils.distanceMeters(
                p1.lat,
                p1.lon,
                p2.lat,
                p2.lon
            );
        const speed =
            Utils.speedKnots(
                distance,
                segmentSeconds
            );
        if ( !Number.isFinite(speed) || speed > MAX_REASONABLE_SPEED) {
            console.warn( "Ignoring impossible speed", speed, "kt at sourceIndex", sourceIndex);
            return;
        }
        //--------------------------------------------------
        // Number of samples
        //--------------------------------------------------
        const count =
            Math.max(
                1,
                Math.floor( segmentSeconds / this.interval)
            );
        //--------------------------------------------------
        // Generate samples
        //--------------------------------------------------
        for ( let i = 0; i < count; i++) {
            const t = i / count;
            const pos =
                Utils.interpolatePoint(
                    p1,
                    p2,
                    t
                );
            const sampleTime =
                new Date(
                    p1.time.getTime() +
                    t *
                    (p2.time.getTime() -
                     p1.time.getTime())
                );
            const elapsed =
                (sampleTime -
                 flightStart) / 1000;
            const progress =
                elapsed /
                totalDuration;
/* 
 Sample layout:
[0] Latitude
[1] Longitude
[2] Altitude (ft)
[3] Heading (deg)
[4] Speed (kt)
[5] Time (Date)
[6] Progress (0.0-1.0)
[7] Source point index
[8] Elapsed time (seconds)
*/
            this.samples.push([
                pos.lat,
                pos.lon,
                pos.alt,
                heading,
                speed,
                sampleTime,
                progress,
                sourceIndex,
                elapsed
            ]);
        }
    }
    //------------------------------------------------------
    // Append Final Flight Point
    //------------------------------------------------------
    appendFinalPoint(
        point,
        sourceIndex,
        totalDuration,
        flightStart
    ) {
        const lastSample =
        this.samples[ this.samples.length - 1 ];
        // No preceding samples survived (e.g. every segment
        // was rejected for an impossible speed) - fall back
        // to neutral heading/speed instead of crashing.
        const lastHeading = lastSample ? lastSample[3] : 0;
        const lastSpeed = lastSample ? lastSample[4] : 0;
        const elapsed = (point.time - flightStart) / 1000;
        this.samples.push([
            point.lat,
            point.lon,
            point.alt,
            lastHeading,
            lastSpeed,
            point.time,
            1.0, // progress
            sourceIndex,
            elapsed
        ]);
    }
    // Sample Count
    count() {
        return this.samples.length;
    }
    //------------------------------------------------------
    // Get Sample
    //------------------------------------------------------
    getSample(index) {
        if (this.samples.length === 0)
            return null;
        index = Utils.clamp(
            index,
            0,
            this.samples.length - 1
        );
        return this.samples[index];
    }
    //------------------------------------------------------
    // First Sample
    //------------------------------------------------------
    first() {
        return this.samples.length > 0
            ? this.samples[0]
            : null;
    }
    //------------------------------------------------------
    // Last Sample
    //------------------------------------------------------
    last() {
        return this.samples.length > 0
            ? this.samples[ this.samples.length - 1 ]
            : null;
    }
    //------------------------------------------------------
    // Find Sample by Elapsed Time
    //------------------------------------------------------
    findByElapsed(seconds) {
        if (this.samples.length === 0)
            return null;
        //--------------------------------------------------
        // Binary Search
        //--------------------------------------------------
        let low = 0;
        let high = this.samples.length - 1;
        while (low <= high) {
            const mid =
                Math.floor((low + high) / 2);
            const elapsed =
                this.samples[mid][SAMPLE.ELAPSED];
            if (elapsed < seconds)
                low = mid + 1;
            else if (elapsed > seconds)
                high = mid - 1;
            else
                return mid;
        }
        return Utils.clamp(
            low,
            0,
            this.samples.length - 1
        );
    }
    //------------------------------------------------------
    // Find Sample by Progress
    //------------------------------------------------------
    findByProgress(progress) {
        progress =
            Utils.clamp(
                progress,
                0,
                1
            );
        return Math.floor(
            progress *
            (this.samples.length - 1)
        );
    }
    //------------------------------------------------------
    // Export Samples
    //------------------------------------------------------
    getSamples() {
        return this.samples;
    }
}
console.log("sampler.js loaded");

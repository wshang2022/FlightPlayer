/*
==========================================================
FlightPlayer Lite 2
utils.js
==========================================================
*/
"use strict";
const Utils = {
    //------------------------------------------------------
    // Earth radius (meters)
    //------------------------------------------------------
    EARTH_RADIUS: 6371000,
    //------------------------------------------------------
    // Degrees ↔ Radians
    //------------------------------------------------------
    toRadians(degrees) { return degrees * Math.PI / 180.0; },
    toDegrees(radians) {
        return radians * 180.0 / Math.PI;
    },
    //------------------------------------------------------
    // Clamp
    //------------------------------------------------------
    clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
    //------------------------------------------------------
    // Linear interpolation
    //------------------------------------------------------
    lerp(a, b, t) { return a + (b - a) * t; },
    //------------------------------------------------------
    // Interpolate between two GPS points
    //------------------------------------------------------
    interpolatePoint(p1, p2, t) {
        let lon1 = p1.lon;
        let lon2 = p2.lon;
        //--------------------------------------------------
        // Handle International Date Line
        //--------------------------------------------------
        const delta = lon2 - lon1;
        if (delta > 180) { lon2 -= 360; }
        else if (delta < -180) { lon2 += 360; }
        return {
            lat: this.lerp(p1.lat, p2.lat, t),
            lon: this.lerp( lon1, lon2, t),
            alt: this.lerp( p1.alt, p2.alt, t)
        };
    },
    //------------------------------------------------------
    // Haversine distance
    // Returns meters
    //------------------------------------------------------
    distanceMeters(lat1, lon1, lat2, lon2) {
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) *
            Math.cos(φ2) *
            Math.sin(Δλ / 2) *
            Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS * c;
    },
    //------------------------------------------------------
    // Heading
    // Returns degrees 0-359
    //------------------------------------------------------
    heading(lat1, lon1, lat2, lon2) {
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const λ1 = this.toRadians(lon1);
        const λ2 = this.toRadians(lon2);
        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x =
            Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) *
            Math.cos(φ2) *
            Math.cos(λ2 - λ1);
        let brng = this.toDegrees(Math.atan2(y, x));
        brng = (brng + 360) % 360;
        return brng;
    },
    //------------------------------------------------------
    // Speed (knots)
    //------------------------------------------------------
    speedKnots(distanceMeters, seconds) {
        if (seconds <= 0) return 0;
        return (distanceMeters / seconds) * 1.943844;
    },
    //------------------------------------------------------
    // Format altitude
    //------------------------------------------------------
    formatAltitude(feet) {
        return Number(Math.round(feet)).toLocaleString() + " ft";
    },
    //------------------------------------------------------
    // Format coordinate
    //------------------------------------------------------
    formatCoordinate(value) {
        return Number(value).toFixed(6) + "°";
    },
    //------------------------------------------------------
    // Format heading
    //------------------------------------------------------
    formatHeading(degrees) {
        return Math.round(degrees) + "°";
    },
    //------------------------------------------------------
    // Format speed
    //------------------------------------------------------
    formatSpeed(knots) {
        return knots.toFixed(1) + " kt";
    },
    //------------------------------------------------------
    // Format Date
    //------------------------------------------------------
    formatTime(date) {
        return date.toLocaleString();
    },
    //------------------------------------------------------
    // Elapsed Time
    //------------------------------------------------------
    formatElapsed(seconds) {
        seconds = Math.floor(seconds);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return (
            String(h).padStart(2, "0") + ":" +
            String(m).padStart(2, "0") + ":" +
            String(s).padStart(2, "0")
        );
    },
    //------------------------------------------------------
    // Parse
    // "Sat 07:40:18 PM"
    //------------------------------------------------------
    parseFlightTime(text, flightDate) {
        const m = text.match( /(\d+):(\d+):(\d+)\s+(AM|PM)/i);
        if (!m) return null;
        const d = new Date(flightDate + "T00:00:00");
        let h = parseInt(m[1]);
        if (m[4].toUpperCase() === "PM" && h !== 12) h += 12;
        if (m[4].toUpperCase() === "AM" && h === 12) h = 0;
        d.setHours( h, parseInt(m[2]), parseInt(m[3]), 0);
        return d;
    }
};
console.log("utils.js loaded");

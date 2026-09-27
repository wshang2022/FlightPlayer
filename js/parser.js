/*
==========================================================
FlightPlayer Lite 2
parser.js
==========================================================
*/
"use strict";
//--------------------------------------------------
// CSV Columns (FlightAware)
//--------------------------------------------------
const CSV_TIME = 0;
const CSV_LAT  = 1;
const CSV_LON  = 2;
const CSV_ALT  = 6;
class Parser {
    //constructor(flightDate) {
        // this.flightDate = flightDate;
    //}
    // constructor() { }
    //--------------------------------------------------
    // Parse FlightAware CSV
    //--------------------------------------------------
    parseCSV(text) {
        const lines =
            text.split(/\r?\n/);
        const points = [];
        //--------------------------------------------------
        // Synthetic date
        //--------------------------------------------------
        let dayOffset = 0;
        let previousSeconds = -1;
        //--------------------------------------------------
        // Process every line
        //--------------------------------------------------
        for (const line of lines) {
            if (!line.trim()) continue;
            //--------------------------------------------------
            // Split CSV
            //--------------------------------------------------
            const fields = this.parseCSVLine(line);
            //--------------------------------------------------
            // Need at least 7 columns
            //--------------------------------------------------
            if (fields.length <= CSV_ALT) continue;
            //--------------------------------------------------
            // Latitude / Longitude
            //--------------------------------------------------
            const lat = Number(fields[CSV_LAT]);
            const lon = Number(fields[CSV_LON]);
            //--------------------------------------------------
            // Ignore metadata
            //--------------------------------------------------
            if ( !Number.isFinite(lat) || !Number.isFinite(lon))
                continue;
            //--------------------------------------------------
            // Altitude
            //--------------------------------------------------
            const alt = this.parseAltitude( fields[CSV_ALT]);
            //--------------------------------------------------
            // Parse time
            //--------------------------------------------------
            const result =
                this.parseCSVTime(
                    fields[CSV_TIME],
                    previousSeconds,
                    dayOffset
                );
            previousSeconds = result.seconds;
            dayOffset = result.dayOffset;
            //--------------------------------------------------
            // Save point
            //--------------------------------------------------
            points.push({
                time: result.time,
                lat,
                lon,
                alt
            }); 
        }
        if (!points || points.length < 2) {
            throw new Error( "No valid flight points found.");
        }
        return {
            points
        };
    }
    //--------------------------------------------------
    // Parse Altitude
    //--------------------------------------------------
    parseAltitude(text) {
        if (!text) return 0;
        return Number(
            text
                .replaceAll('"', "")
                .replaceAll(",", "")
        );
    }
    //--------------------------------------------------
    // Split CSV Line
    //--------------------------------------------------
    parseCSVLine(line) {
        const fields = [];
        let field = "";
        let quote = false;
        for (const ch of line) {
            if (ch === '"') {
                quote = !quote;
                continue;
            }
            if ( ch === "," && !quote) {
                fields.push(field.trim());
                field = "";
                continue;
            }
            field += ch;
        }
        fields.push(field.trim());
        return fields;
    }
    //--------------------------------------------------
    // Parse FlightAware Time
    //--------------------------------------------------
    parseCSVTime( text, previousSeconds, dayOffset) {
        // Example:
        // Sat 07:40:18 PM
        const parts = text.trim().split(/\s+/);
        if (parts.length < 3) {
            return {
                time: new Date(2026, 7, 22),
                seconds: 0,
                dayOffset
            };
        }
        let [hour, minute, second] =
            parts[1]
                .split(":")
                .map(Number);
        const ampm = parts[2];
        if ( ampm === "PM" && hour !== 12)
            hour += 12;
        if ( ampm === "AM" && hour === 12)
            hour = 0;
        const seconds =
            hour * 3600 +
            minute * 60 +
            second;
        //--------------------------------------------------
        // Midnight rollover
        //--------------------------------------------------
        if ( previousSeconds >= 0 && seconds < previousSeconds) {
            dayOffset++;
        }
        const time =
            new Date(
                2026,
                7,
                22 + dayOffset,
                hour,
                minute,
                second
            );
        return {
            time,
            seconds,
            dayOffset
        };
    }
//------------------------------------------------------
// Parse KML text
//------------------------------------------------------
    parseKML(kmlText) {
        const xml =
            new DOMParser().parseFromString(
                kmlText,
                "application/xml"
            );
        const parserError = xml.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
            throw new Error( "Invalid KML document.");
        }
        const placemarks =
            xml.getElementsByTagNameNS( "*", "Placemark");
const documentNode =
xml.getElementsByTagNameNS(
"*",
"Document"
)[0];

let flightName = null;

if (documentNode) {
    const nameNode =
        documentNode.getElementsByTagNameNS( "*", "name")[0];
    if (nameNode) {
        const fullName = nameNode.textContent.trim();
        const match =
            fullName.match( /FlightAware\s+✈\s+(.+?)\s+\(/);
        if (match) {
            flightName = match[1].trim();
        }
    }
}
        const points = [];
        Array.from(placemarks).forEach(pm => {
            //--------------------------------------------------
            // ADSB.lol gx:Track format
            //--------------------------------------------------
            const tracks = pm.getElementsByTagNameNS( "*", "Track");
            if (tracks.length > 0) {
                const trackPoints =
                    this.parseGXTracks(tracks);
                points.push(...trackPoints);
                return;
            }
            //--------------------------------------------------
            // Existing KML format
            //--------------------------------------------------
            const point = this.parsePlacemark(pm);
            if (point) points.push(point);
        });
        if (!points || points.length < 2) {
            throw new Error( "No valid flight points found.");
        }
        // points.sort( (a, b) => a.time - b.time); // in case data are not sorted
        return {
            name: flightName,
            count: points.length,
            startTime: points[0].time,
            endTime:
                points[points.length - 1].time,
            points: points
        };
    }
    //------------------------------------------------------
    // Parse ADSB.lol gx:Track format
    //------------------------------------------------------
    parseGXTracks(tracks) {
        const points = [];
        for (const track of tracks) {
            const whenNodes =
                track.getElementsByTagNameNS( "*", "when");
            const coordNodes =
                track.getElementsByTagNameNS( "*", "coord");
            const whenCount =
                whenNodes.length;
            const coordCount =
                coordNodes.length;
            if (whenCount !== coordCount) {
                console.warn( "gx:Track count mismatch:", "when =", whenCount, "coord =", coordCount);
            }
            const count =
                Math.min( whenCount, coordCount);
            for (let i = 0; i < count; i++) {
                //--------------------------------------------------
                // Time
                //--------------------------------------------------
                const time =
                    new Date(
                        whenNodes[i]
                            .textContent
                            .trim()
                    );
                //--------------------------------------------------
                // Coordinate
                //
                // gx:coord format:
                // longitude latitude altitude
                //--------------------------------------------------
                const values =
                    coordNodes[i]
                        .textContent
                        .trim()
                        .split(/\s+/)
                        .map(Number);
                if (values.length < 2) continue;
                const lon = values[0];
                const lat = values[1];
                const alt = values.length >= 3 ? values[2] : 0;
                //--------------------------------------------------
                // Validate
                //--------------------------------------------------
                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lon) ||
                    !Number.isFinite(alt) ||
                    Number.isNaN( time.getTime())
                ) {
                    continue;
                }
                points.push({
                    time: time,
                    lat: lat,
                    lon: lon,
                    alt: alt * FEET_PER_METER
                });
            }
        }
        return points;
    }
    //------------------------------------------------------
    // Parse one placemark
    //------------------------------------------------------
    parsePlacemark(pm) {
        const nameNode =
            pm.getElementsByTagNameNS("*", "name")[0];
        const coordNode =
            pm.getElementsByTagNameNS("*", "coordinates")[0];
        if (!nameNode || !coordNode) return null;
        const coords =
            coordNode.textContent
                .trim()
                .split(",");
        if (coords.length < 2) return null;
        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        //--------------------------------------------------
        // KML <coordinates> altitude is in meters; convert
        // to feet so units match the gx:Track parsing path.
        //--------------------------------------------------
        const altMeters = coords.length >= 3 ? Number(coords[2]) : 0;
        const alt = altMeters * FEET_PER_METER;
        if ( Number.isNaN(lat) || Number.isNaN(lon)) {
            return null;
        }
        //--------------------------------------------------
        // flightDate may not be supplied (no UI control for
        // it currently); fall back to today's date so the
        // point still gets a valid Date instead of "Invalid
        // Date" silently breaking downstream.
        //--------------------------------------------------
        const flightDate =
            this.flightDate ||
            new Date().toISOString().slice(0, 10);
        const time =
            Utils.parseFlightTime( nameNode.textContent.trim(), flightDate);
        if (!time || Number.isNaN(time.getTime()))
            return null;
        return {
            lat: lat,
            lon: lon,
            alt: alt,
            time: time
        };
    }
}
console.log("parser.js loaded");

"use strict";
class KmlWriter {
    static escapeXml(unsafe) {
      return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case "'": return '&apos;';
          case '"': return '&quot;';
        }
      });
    }
    static write(flight) {
        let kml = "";
        //------------------------------------------
        // XML Header
        //------------------------------------------
        kml += '<?xml version="1.0" encoding="UTF-8"?>\n';
        kml +=
            '<kml xmlns="http://www.opengis.net/kml/2.2" ' +
            'xmlns:gx="http://www.google.com/kml/ext/2.2">\n';
        kml += '  <Document>\n';
        let name =
            flight.name || "Flight";
        name=this.escapeXml(name);
        kml += `    <name>${name}</name>\n`;
        //------------------------------------------
        // Placemark
        //------------------------------------------
        kml += '    <Placemark>\n';
        kml += `      <name>${name}</name>\n`;
        //------------------------------------------
        // Track
        //------------------------------------------
        kml += '      <gx:Track>\n';
        kml += '        <altitudeMode>absolute</altitudeMode>\n';
        //------------------------------------------
        // Timestamps
        //------------------------------------------
        for (const point of flight.points) {
            kml += `        <when>${point.time.toISOString()}</when>\n`;
        }
        //------------------------------------------
        // Coordinates
        //------------------------------------------
        for (const point of flight.points) {
            const altitudeMeters = point.alt / FEET_PER_METER;
            kml +=
                `        <gx:coord>` +
                `${point.lon} ${point.lat} ${altitudeMeters}` +
                `</gx:coord>\n`;
        }
        //------------------------------------------
        // Close Track
        //------------------------------------------
        kml += '      </gx:Track>\n';
        kml += '    </Placemark>\n';
        kml += '  </Document>\n';
        kml += '</kml>\n';
        return kml;
    }
}

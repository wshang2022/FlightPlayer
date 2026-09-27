const SAMPLE = {
    LAT: 0,
    LON: 1,
    ALT: 2,
    HEADING: 3,
    SPEED: 4,
    TIME: 5,
    PROGRESS: 6,
    SOURCE: 7,
    ELAPSED: 8
};
const FEET_PER_METER = 3.28084;
//--------------------------------------------------
// Adaptive sample interval
//
// Rather than always sampling every 0.1s (561k+ samples
// for a 16-hour flight), pick an interval that targets a
// roughly constant total sample budget, so long flights
// stay fast to load/play while short flights keep fine
// (0.1s) resolution.
//--------------------------------------------------
const TARGET_SAMPLE_COUNT = 60000;
const MIN_SAMPLE_INTERVAL = 0.1;   // seconds - finest resolution
const MAX_SAMPLE_INTERVAL = 2.0;   // seconds - coarsest resolution

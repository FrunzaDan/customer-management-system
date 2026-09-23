// Wire formats for dates coming from the API. JSON has no date type, so these stay strings;
// the aliases document which of the two ISO 8601 shapes a field holds.

// A UTC instant, e.g. "2026-09-22T05:47:00Z". The trailing "Z" makes `new Date()` and the
// `date` pipe convert it to the viewer's local time correctly.
export type IsoDateTime = string;

// A calendar date with no time or zone, e.g. "1990-01-02" — the format <input type="date">
// reads and writes.
export type IsoDate = string;

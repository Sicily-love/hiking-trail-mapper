const assert = require('assert');
const core = require('../../src/core/index.ts');

function denseTrail(trailIndex, pointCount) {
  const id = `dense-${trailIndex}`;
  const track = Array.from({length:pointCount}, (_, index) => [
    29 + trailIndex * 0.01 + (index % 400) / 100_000,
    99 + trailIndex * 0.01 + (index % 600) / 100_000,
    2500 + (index % 900),
  ]);
  const daySize = Math.floor((pointCount - 1) / 4);
  return {
    id,
    name:`Dense trail ${trailIndex}`,
    group:`Group ${trailIndex % 3}`,
    color:'#2F674B',
    track,
    day_meta:Array.from({length:4}, (_, dayIndex) => ({
      d:dayIndex + 1,
      i_start:dayIndex * daySize,
      i_end:dayIndex === 3 ? pointCount - 1 : (dayIndex + 1) * daySize,
      camp:`Camp ${dayIndex + 1}`,
    })),
    waypoints:Array.from({length:12}, (_, waypointIndex) => {
      const gpsIndex = Math.min(pointCount - 1, waypointIndex * Math.floor(pointCount / 12));
      return {
        id:`${id}-waypoint-${waypointIndex}`,
        name:`Waypoint ${waypointIndex}`,
        tag:waypointIndex % 3 === 0 ? 'camp' : 'water',
        gps_idx:gpsIndex,
        photo:waypointIndex === 0 ? 'data:image/png;base64,AA==' : '',
      };
    }),
    escape_routes:[{
      id:`${id}-escape`,
      name:'Dense escape',
      days:[2, 3],
      line:[[track[daySize][0], track[daySize][1]], [track[daySize * 2][0], track[daySize * 2][1]]],
    }],
  };
}

console.log('\nProject archive stress');
const started = Date.now();
const trails = Array.from({length:12}, (_, index) => denseTrail(index, 15_000));
const archive = core.createProjectArchive({
  project:{title:'Dense expedition', trails, calc_method:{}},
  state:{
    activeTrails:trails.map(trail => trail.id),
    activeGroup:'Group 0',
    primaryByGroup:{'Group 0':'dense-0', 'Group 1':'dense-1', 'Group 2':'dense-2'},
    mode:'elev',
  },
  appVersion:'v2.2.10',
  exportedAt:'2026-08-10T00:00:00.000Z',
});
const text = core.serializeProjectArchive(archive);
const parsed = core.parseProjectArchive(text);
assert.strictEqual(parsed.ok, true);
const summary = core.summarizeProjectArchive(parsed.archive, Buffer.byteLength(text));
assert.deepStrictEqual({
  trails:summary.trailCount,
  groups:summary.groupCount,
  points:summary.trackPointCount,
  waypoints:summary.waypointCount,
  photos:summary.waypointPhotoCount,
  days:summary.dayCount,
  escapes:summary.escapeRouteCount,
  active:summary.activeTrailCount,
}, {
  trails:12, groups:3, points:180_000, waypoints:144, photos:12, days:48, escapes:12, active:12,
});

const legacy = JSON.parse(text);
legacy.schemaVersion = 1;
delete legacy.project.calc_method;
for(const trail of legacy.project.trails) {
  delete trail.stats;
  trail.track.forEach(point => point.splice(3));
  trail.day_meta.forEach(day => {
    delete day.km;
    delete day.asc;
    delete day.desc;
    delete day.max;
    delete day.min;
    delete day.camp_elev;
  });
}
const migrated = core.parseProjectArchive(JSON.stringify(legacy));
assert.strictEqual(migrated.ok, true);
assert.strictEqual(migrated.migratedFrom, 1);
const rebuilt = core.rebuildProjectDerivedData(migrated.archive.project);
assert.strictEqual(rebuilt.trails.length, 12);
assert.ok(rebuilt.trails.every(trail =>
  Number.isFinite(trail.stats.distance_km)
  && Number.isFinite(trail.stats.ascent_m)
  && Number.isFinite(trail.stats.descent_m)
  && trail.track[0][3] === 0
  && trail.day_meta.every(day => ['km','asc','desc','max','min','camp_elev']
    .every(key => Number.isFinite(day[key])))
  && trail.waypoints.every(waypoint => ['gps_idx','km','elev','day']
    .every(key => Number.isFinite(waypoint[key])))
  && trail.escape_routes.every(route =>
    Number.isFinite(route.distance_km) && Number.isFinite(route.drop_m))));

console.log(`  PASS 12 trails / 180,000 points / ${(Buffer.byteLength(text) / 1024 / 1024).toFixed(1)} MiB`);
console.log(`Result: stress archive passed in ${Date.now() - started} ms`);

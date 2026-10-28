import request from './request.js';
import Progress from './Progress.js';

// Public Overpass instances, see https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
// The main instance goes first; the rest are tried in order when it is busy or unreachable.
let backends = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Public servers often answer "busy" (429/504) straight away and succeed a few
// seconds later, so quick failures get a few more rounds, with pauses between them.
const ROUNDS = 3;
const PAUSE_MS = [0, 2000, 5000];

/**
 * Posts a query to Overpass, falling back to the next server when one fails.
 *
 * @param {string} data - Overpass QL query
 * @param {Progress} progress - notified with {loaded: -1, attempt, of} when we switch servers
 * @param {number} [queryTimeout] - the [timeout:] the query declares, in seconds.
 * Each server gets that long, plus time to transfer the result, before we move on.
 */
export default function postData(data, progress, queryTimeout) {
  progress = progress || new Progress();
  const options = {
    method: 'POST',
    responseType: 'json',
    progress,
    // Overpass sends nothing until the query is done, so leave room for the download itself.
    timeout: ((queryTimeout || 180) + 120) * 1000,
    headers: {
      'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: 'data=' + encodeURIComponent(data),
  };

  // A server that let a request time out is not asked again: that already took minutes.
  let slow = new Set();
  let attempts = [];
  for (let round = 0; round < ROUNDS; ++round) {
    backends.forEach((url, i) => attempts.push({url, round, first: i === 0}));
  }
  let attempt = 0;
  let lastError = null;

  return next();

  function next() {
    while (attempt < attempts.length && slow.has(attempts[attempt].url)) attempt += 1;
    if (attempt >= attempts.length) {
      let err = lastError || new Error('OpenStreetMap servers did not respond.');
      err.allServersFailed = true;
      err.serversAttempted = backends.length;
      return Promise.reject(err);
    }
    let current = attempts[attempt];
    let pause = current.first ? PAUSE_MS[current.round] : 0;
    return wait(pause, progress)
      .then(() => request(current.url, options))
      .then(throwOnRuntimeError)
      .catch(err => {
        if (err.cancelled) throw err;
        if (err.queryTooLarge) throw err; // Another server will not do any better.
        if (err.timedOut) slow.add(current.url);
        lastError = err;
        attempt += 1;
        progress.notify({loaded: -1, attempt: attempt + 1, of: attempts.length});
        return next();
      });
  }
}

function wait(ms, progress) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer = setTimeout(resolve, ms);
    if (progress.onCancel) {
      progress.onCancel(() => {
        clearTimeout(timer);
        let err = new Error('Cancelled');
        err.cancelled = true;
        reject(err);
      });
    }
  });
}

/**
 * Overpass reports timeouts and out-of-memory errors with HTTP 200 and a `remark`,
 * returning whatever it had collected so far. Treat that as an error instead of
 * rendering half a city.
 */
function throwOnRuntimeError(response) {
  let remark = response && response.remark;
  if (remark && remark.indexOf('runtime error') > -1) {
    let err = new Error(remark);
    if (remark.indexOf('out of memory') > -1 || remark.indexOf('Query run out of memory') > -1) {
      err.queryTooLarge = true;
      err.message = 'This area is too large for OpenStreetMap servers to return in one go. Try a smaller area.';
    }
    throw err;
  }
  return response;
}

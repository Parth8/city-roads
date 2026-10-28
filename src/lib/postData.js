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

/**
 * Posts a query to Overpass, falling back to the next server when one fails.
 *
 * @param {string} data - Overpass QL query
 * @param {Progress} progress
 * @param {number} [queryTimeout] - the [timeout:] the query declares, in seconds.
 * Each server gets that long, plus time to transfer the result, before we move on.
 */
export default function postData(data, progress, queryTimeout) {
  progress = progress || new Progress();
  const postData = {
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

  let serverIndex = 0;

  return fetchFrom(backends[serverIndex]);

  function fetchFrom(overpassUrl) {
    return request(overpassUrl, postData)
      .then(throwOnRuntimeError)
      .catch(handleError);
  }

  function handleError(err) {
    if (err.cancelled) throw err;
    if (err.queryTooLarge) throw err; // Another server will not do any better.

    if (serverIndex >= backends.length - 1) {
      // we can't do much anymore - all servers failed
      err.allServersFailed = true;
      err.serversAttempted = backends.length;
      throw err;
    }

    progress.notify({
      loaded: -1
    });

    serverIndex += 1;
    return fetchFrom(backends[serverIndex])
  }
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

/**
 * Tiny wrapper around the query string, so a poster can be shared by link.
 */
export default {
  get(key) {
    return new URLSearchParams(window.location.search).get(key);
  },

  /**
   * Updates the given keys (null removes one) without adding a history entry.
   */
  replace(values) {
    let params = new URLSearchParams(window.location.search);
    Object.keys(values).forEach(key => {
      let value = values[key];
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    });
    window.history.replaceState(null, '', toUrl(params));
  },

  /**
   * Replaces the whole query string and adds a history entry, so "back" works.
   */
  navigate(values) {
    let params = new URLSearchParams();
    Object.keys(values).forEach(key => params.set(key, values[key]));
    window.history.pushState(null, '', toUrl(params));
  }
};

function toUrl(params) {
  let search = params.toString();
  return window.location.pathname + (search ? '?' + search : '') + window.location.hash;
}

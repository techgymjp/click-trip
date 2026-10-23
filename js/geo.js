// 地理計算: 距離・方位・移動先・2km マス
(function (global) {
  'use strict';

  const R = 6371.0088; // 地球の平均半径 (km)
  const CELL_KM = 2;
  const DLAT = CELL_KM / 111.32;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  /** 2 点間の大円距離 (km) */
  function distance(a, b) {
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** a から見た b の方位角 (度, 北=0 時計回り) */
  function bearing(a, b) {
    const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
      Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }

  /** a から方位 brg (度) に dist (km) 進んだ地点 */
  function destination(a, brg, dist) {
    const d = dist / R;
    const t = rad(brg);
    const lat1 = rad(a.lat);
    const lon1 = rad(a.lon);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(t));
    const lon2 = lon1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 };
  }

  /**
   * 2km 四方のマス。緯度方向は 2km 刻みの帯、経度方向は帯の中心緯度で 2km になる幅で区切る。
   * tools/build_spots.py の cell_of と同じ式。
   */
  function cellOf(p) {
    const row = Math.floor(p.lat / DLAT);
    const clat = (row + 0.5) * DLAT;
    const dlon = CELL_KM / (111.32 * Math.cos(rad(clat)));
    const col = Math.floor(p.lon / dlon);
    return { row, col, key: row + ':' + col };
  }

  /** マスの四隅 (描画用) */
  function cellBounds(cell) {
    const clat = (cell.row + 0.5) * DLAT;
    const dlon = CELL_KM / (111.32 * Math.cos(rad(clat)));
    return { s: cell.row * DLAT, n: (cell.row + 1) * DLAT, w: cell.col * dlon, e: (cell.col + 1) * dlon };
  }

  const DIRS16 = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
  const DIRS16_EN = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dirName = (b) => (typeof I18N !== 'undefined' && I18N.lang === 'en' ? DIRS16_EN : DIRS16)[Math.round(b / 22.5) % 16];

  function fmtKm(km) {
    if (km < 1) return Math.round(km * 1000) + 'm';
    if (km < 10) return km.toFixed(2) + 'km';
    if (km < 100) return km.toFixed(1) + 'km';
    return Math.round(km).toLocaleString() + 'km';
  }

  global.Geo = { distance, bearing, destination, cellOf, cellBounds, dirName, fmtKm, CELL_KM };
})(window);

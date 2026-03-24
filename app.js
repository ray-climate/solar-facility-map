const DEFAULT_CONFIG = {
  pmtilesUrl: "https://pub-80c436a85ac94757a93302c2e2bb32f5.r2.dev/global_pv_facility_inventory.pmtiles",
  sourceLayer: "global_pv_facility_inventory",
  metadataUrl: "./metadata.json",
  paperUrl: "https://www.nature.com/",
  zenodoUrl: "https://zenodo.org/records/18794231",
  githubUrl: "https://github.com/",
};

const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.PV_DASHBOARD_CONFIG || {});

const pmtilesProtocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
const POLYGON_MIN_ZOOM = 7;
const UK_CENTER_LNG = -2;
const PV_TILE_MAX_ZOOM = 12;
const POINT_STYLE_STORAGE_KEY = "pv_dashboard_point_style";
const BASEMAPS = {
  cinematic: {
    tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Imagery © Esri",
    use3D: true,
    camera: { pitch: 28, bearing: -12 },
    rasterPaint: {
      "raster-brightness-min": 0.06,
      "raster-brightness-max": 0.78,
      "raster-saturation": -0.1,
      "raster-contrast": 0.2,
    },
    fog: {
      "horizon-blend": 0.14,
      color: "rgba(14, 20, 34, 0.42)",
      "high-color": "rgba(28, 40, 62, 0.36)",
      "space-color": "rgba(0, 0, 3, 1)",
      "star-intensity": 0.95,
    },
  },
};
const POLYGON_OUTLINE_OPACITY_STOPS = [
  [7, 0.34],
  [9, 0.48],
  [11, 0.62],
  [13, 0.76],
  [15, 0.88],
];
const POLYGON_OUTLINE_WIDTH_STOPS = [
  [7, 0.7],
  [9, 1.15],
  [11, 1.75],
  [13, 2.45],
  [15, 3.2],
];
const POINT_RADIUS_STOPS = [
  [0, 0.7],
  [2, 1.0],
  [4, 1.5],
  [6.9, 2.4],
];
const POINT_STYLE_PRESETS = {
  subtle: {
    coreColor: "#dc2626",
    glowColor: "#ef4444",
    coreRadiusStops: [
      [0, 0.42],
      [2, 0.62],
      [4, 0.88],
      [6.9, 1.24],
    ],
    glowRadiusStops: [
      [0, 1.1],
      [2, 1.55],
      [4, 2.12],
      [6.9, 2.7],
    ],
    coreOpacity: 0.84,
    glowOpacity: 0.2,
    glowBlur: 0.7,
    coreStrokeWidth: 0.16,
    coreStrokeColor: "rgba(255,255,255,0.26)",
    showGlow: true,
    blink: {
      enabled: true,
      durationMs: 1800,
      waveFactor: 4.6,
      decayPower: 0.85,
      glowOpacityBoost: 0.16,
      coreOpacityBoost: 0.04,
      glowBlurDrop: 0.08,
      coreScaleBoost: 0.08,
      glowScaleBoost: 0.18,
    },
  },
  cinematic: {
    coreColor: "#ea4335",
    glowColor: "#ff7a59",
    coreRadiusStops: [
      [0, 0.5],
      [2, 0.74],
      [4, 1.08],
      [6.9, 1.52],
    ],
    glowRadiusStops: [
      [0, 1.48],
      [2, 2.05],
      [4, 2.72],
      [6.9, 3.55],
    ],
    coreOpacity: 0.9,
    glowOpacity: 0.33,
    glowBlur: 0.6,
    coreStrokeWidth: 0.2,
    coreStrokeColor: "rgba(255,255,255,0.32)",
    showGlow: true,
    blink: {
      enabled: true,
      durationMs: 2300,
      waveFactor: 6.2,
      decayPower: 0.65,
      glowOpacityBoost: 0.28,
      coreOpacityBoost: 0.08,
      glowBlurDrop: 0.18,
      coreScaleBoost: 0.16,
      glowScaleBoost: 0.34,
    },
  },
  clean: {
    coreColor: "#d63b2e",
    glowColor: "#f05a4f",
    coreRadiusStops: [
      [0, 0.44],
      [2, 0.64],
      [4, 0.92],
      [6.9, 1.3],
    ],
    glowRadiusStops: [
      [0, 0.95],
      [2, 1.3],
      [4, 1.7],
      [6.9, 2.2],
    ],
    coreOpacity: 0.86,
    glowOpacity: 0.12,
    glowBlur: 0.76,
    coreStrokeWidth: 0.12,
    coreStrokeColor: "rgba(255,255,255,0.24)",
    showGlow: false,
    blink: {
      enabled: false,
    },
  },
};

const YEAR_COLORS = [
  "#f8e7cb",
  "#f2d39f",
  "#ecbf77",
  "#e3ab58",
  "#d88f3f",
  "#cd7630",
  "#b6602a",
  "#954b25",
];

const ui = {
  metricFacilities: document.getElementById("metric-facilities"),
  metricCountries: document.getElementById("metric-countries"),
  metricYears: document.getElementById("metric-years"),
  metricArea: document.getElementById("metric-area"),
  mapStatus: document.getElementById("map-status"),
  fitGlobal: document.getElementById("fit-global"),
  legend: document.getElementById("legend"),
  toolbarTitle: document.getElementById("toolbar-title"),
  downloadVisible: document.getElementById("download-visible"),
  featureCard: document.getElementById("feature-card"),
  fcPvid: document.getElementById("fc-pvid"),
  fcCountry: document.getElementById("fc-country"),
  fcYear: document.getElementById("fc-year"),
  fcArea: document.getElementById("fc-area"),
  fcLat: document.getElementById("fc-lat"),
  fcLon: document.getElementById("fc-lon"),
  sidebarGlobe: document.getElementById("sidebar-globe"),
  basemapButtons: Array.from(document.querySelectorAll(".segment[data-basemap]")),
  pointStyleButtons: Array.from(document.querySelectorAll(".segment[data-point-style]")),
};

const state = {
  metadata: null,
  theme: "cinematic",
  basemap: "cinematic",
  pointStyle: "subtle",
  yearColorsVisible: false,
};

let map;
let previewMap;
let pvSourceLive = false;
let introBlinkPlayed = false;
let polygonBlinkStarted = false;
let introSpinPlayed = false;
let introSpinCancelled = false;
let previewLoopStarted = false;

function getPointStyle() {
  return POINT_STYLE_PRESETS[state.pointStyle] || POINT_STYLE_PRESETS.subtle;
}

function radiusExpression(stops, scale = 1) {
  const expression = ["interpolate", ["linear"], ["zoom"]];
  stops.forEach(([zoom, radius]) => {
    expression.push(zoom, Number((radius * scale).toFixed(3)));
  });
  return expression;
}

function opacityExpression(stops, scale = 1) {
  const expression = ["interpolate", ["linear"], ["zoom"]];
  stops.forEach(([zoom, opacity]) => {
    expression.push(zoom, Number((opacity * scale).toFixed(3)));
  });
  return expression;
}

function applyPointStyleToMap(style) {
  if (!map) {
    return;
  }

  if (map.getLayer("pv-points-glow")) {
    map.setPaintProperty("pv-points-glow", "circle-color", style.glowColor);
    map.setPaintProperty("pv-points-glow", "circle-radius", radiusExpression(style.glowRadiusStops));
    map.setPaintProperty("pv-points-glow", "circle-opacity", style.glowOpacity);
    map.setPaintProperty("pv-points-glow", "circle-blur", style.glowBlur);
    map.setLayoutProperty("pv-points-glow", "visibility", style.showGlow ? "visible" : "none");
  }

  if (map.getLayer("pv-points")) {
    map.setPaintProperty("pv-points", "circle-color", style.coreColor);
    map.setPaintProperty("pv-points", "circle-radius", radiusExpression(style.coreRadiusStops));
    map.setPaintProperty("pv-points", "circle-opacity", style.coreOpacity);
    map.setPaintProperty("pv-points", "circle-stroke-width", style.coreStrokeWidth);
    map.setPaintProperty("pv-points", "circle-stroke-color", style.coreStrokeColor);
  }
}

function fmtInt(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function fmtAreaM2(m2) {
  if (m2 >= 1_000_000) {
    return `${(m2 / 1_000_000).toFixed(2)} km²`;
  }
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(1)} ha`;
  }
  return `${m2.toFixed(0)} m²`;
}

function setStatus(message) {
  if (!ui.mapStatus) {
    if (message) {
      console.info(message);
    }
    return;
  }

  if (!message) {
    ui.mapStatus.classList.add("hidden");
    ui.mapStatus.textContent = "";
    return;
  }

  ui.mapStatus.classList.remove("hidden");
  ui.mapStatus.textContent = message;
}

function initLinks() {
  document.getElementById("paper-link").href = CONFIG.paperUrl;
  document.getElementById("zenodo-link").href = CONFIG.zenodoUrl;
  document.getElementById("github-link").href = CONFIG.githubUrl;
}

function initTheme() {
  state.theme = "cinematic";
  document.body.dataset.theme = "cinematic";
}

function applyPointStyle(styleName, { persist = true, replayIntro = false } = {}) {
  const allowedStyles = new Set(Object.keys(POINT_STYLE_PRESETS));
  const next = allowedStyles.has(styleName) ? styleName : "subtle";
  state.pointStyle = next;

  ui.pointStyleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.pointStyle === next);
  });

  if (persist) {
    try {
      localStorage.setItem(POINT_STYLE_STORAGE_KEY, next);
    } catch (error) {
      // Ignore storage failures in private mode.
    }
  }

  applyPointStyleToMap(getPointStyle());

  if (replayIntro) {
    introBlinkPlayed = false;
    window.setTimeout(startIntroBlink, 120);
  }
}

function initPointStyle() {
  try {
    const saved = localStorage.getItem(POINT_STYLE_STORAGE_KEY);
    applyPointStyle(saved || "subtle", { persist: false });
    return;
  } catch (error) {
    // Ignore storage failures in private mode.
  }
  applyPointStyle("subtle", { persist: false });
}

function buildLegend(meta) {
  ui.legend.innerHTML = "";
  const minYear = meta.year_range.min;
  const maxYear = meta.year_range.max;
  const span = Math.max(maxYear - minYear, 1);

  for (let year = minYear; year <= maxYear; year += 1) {
    const idx = Math.round(((year - minYear) / span) * (YEAR_COLORS.length - 1));
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span class="swatch" style="background:${YEAR_COLORS[idx]}"></span><span>${year}</span>`;
    ui.legend.appendChild(row);
  }
}

function colorExpression(minYear, maxYear) {
  const expression = ["interpolate", ["linear"], ["to-number", ["coalesce", ["get", "year"], 0]]];
  const span = Math.max(maxYear - minYear, 1);

  for (let year = minYear; year <= maxYear; year += 1) {
    const idx = Math.round(((year - minYear) / span) * (YEAR_COLORS.length - 1));
    expression.push(year, YEAR_COLORS[idx]);
  }

  return expression;
}

function makeStyle(mode) {
  const basemap = BASEMAPS[mode] || BASEMAPS.cinematic;
  const basemapLayer = {
    id: "basemap",
    type: "raster",
    source: "basemap",
  };
  if (basemap.rasterPaint) {
    basemapLayer.paint = basemap.rasterPaint;
  }

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: basemap.tiles,
        tileSize: 256,
        attribution: basemap.attribution,
      },
      pv: {
        type: "vector",
        url: `pmtiles://${CONFIG.pmtilesUrl}`,
        minzoom: 0,
        maxzoom: PV_TILE_MAX_ZOOM,
      },
      "pv-sites": {
        type: "geojson",
        data: "https://pub-80c436a85ac94757a93302c2e2bb32f5.r2.dev/global_pv_sites_points.geojson",
      },
    },
    layers: [
      basemapLayer,
    ],
  };
}

function applyMapViewModeFor(targetMap, mode, { animate = false, cameraOverride = null } = {}) {
  if (!targetMap) {
    return;
  }

  const basemap = BASEMAPS[mode] || BASEMAPS.cinematic;
  const supportsProjection = typeof targetMap.setProjection === "function";
  const supportsFog = typeof targetMap.setFog === "function";

  if (supportsProjection) {
    try {
      targetMap.setProjection({ type: basemap.use3D ? "globe" : "mercator" });
    } catch (error) {
      // Projection support varies by runtime; ignore and keep map usable.
    }
  }

  if (supportsFog) {
    try {
      if (basemap.fog) {
        targetMap.setFog(basemap.fog);
      } else {
        targetMap.setFog(null);
      }
    } catch (error) {
      // Fog support varies by runtime; ignore and keep map usable.
    }
  }

  const camera = cameraOverride || basemap.camera || (basemap.use3D ? { pitch: 44, bearing: -16 } : { pitch: 0, bearing: 0 });

  if (animate) {
    targetMap.easeTo({ ...camera, duration: 900, essential: true });
    return;
  }

  targetMap.jumpTo(camera);
}

function applyMapViewMode(mode, { animate = false } = {}) {
  applyMapViewModeFor(map, mode, { animate });
}

function mapBoundsFromMetadata(meta) {
  const b = meta?.bbox_wgs84;
  if (!b) {
    return [
      [-170, -40],
      [178, 68],
    ];
  }

  return [
    [b.minx, b.miny],
    [b.maxx, b.maxy],
  ];
}

function addPvLayers() {
  if (!map.getSource("pv") || !map.getSource("pv-sites")) {
    return;
  }

  if (!map.getLayer("pv-points-glow")) {
    map.addLayer({
      id: "pv-points-glow",
      type: "circle",
      source: "pv-sites",
      maxzoom: POLYGON_MIN_ZOOM,
      paint: {
        "circle-color": "#ff4d4f",
        "circle-radius": radiusExpression(POINT_RADIUS_STOPS, 1.8),
        "circle-opacity": 0.2,
        "circle-blur": 0.9,
      },
    });
  }

  if (!map.getLayer("pv-points")) {
    map.addLayer({
      id: "pv-points",
      type: "circle",
      source: "pv-sites",
      maxzoom: POLYGON_MIN_ZOOM,
      paint: {
        "circle-color": "#ff5c5e",
        "circle-radius": radiusExpression(POINT_RADIUS_STOPS, 1),
        "circle-opacity": 0.78,
        "circle-stroke-width": 0.15,
        "circle-stroke-color": "rgba(255,255,255,0.4)",
      },
    });
  }

  if (!map.getLayer("pv-fill")) {
    map.addLayer({
      id: "pv-fill",
      type: "fill",
      source: "pv",
      minzoom: POLYGON_MIN_ZOOM,
      "source-layer": CONFIG.sourceLayer,
      paint: {
        "fill-color": colorExpression(state.metadata.year_range.min, state.metadata.year_range.max),
        "fill-opacity": 0,
      },
    });
  }

  if (!map.getLayer("pv-outline")) {
    map.addLayer({
      id: "pv-outline",
      type: "line",
      source: "pv",
      minzoom: POLYGON_MIN_ZOOM,
      "source-layer": CONFIG.sourceLayer,
      paint: {
        "line-color": "#ff2f2f",
        "line-width": radiusExpression(POLYGON_OUTLINE_WIDTH_STOPS),
        "line-opacity": opacityExpression(POLYGON_OUTLINE_OPACITY_STOPS),
      },
    });
  }
}

function addPreviewLayers(targetMap) {
  if (!targetMap.getSource("pv-sites")) {
    return;
  }

  if (!targetMap.getLayer("preview-points-glow")) {
    targetMap.addLayer({
      id: "preview-points-glow",
      type: "circle",
      source: "pv-sites",
      paint: {
        "circle-color": "#ff4d4f",
        "circle-radius": radiusExpression(POINT_RADIUS_STOPS, 1.9),
        "circle-opacity": 0.16,
        "circle-blur": 0.9,
      },
    });
  }

  if (!targetMap.getLayer("preview-points")) {
    targetMap.addLayer({
      id: "preview-points",
      type: "circle",
      source: "pv-sites",
      paint: {
        "circle-color": "#ff5c5e",
        "circle-radius": radiusExpression(POINT_RADIUS_STOPS, 1.05),
        "circle-opacity": 0.72,
        "circle-stroke-width": 0.15,
        "circle-stroke-color": "rgba(255,255,255,0.45)",
      },
    });
  }
}

function wireControls() {
  ui.pointStyleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.pointStyle;
      if (!next || next === state.pointStyle) {
        return;
      }
      applyPointStyle(next, { replayIntro: true });
    });
  });

  ui.basemapButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.basemap;
      if (next === state.basemap) {
        return;
      }

      state.basemap = next;
      ui.basemapButtons.forEach((el) => el.classList.remove("active"));
      button.classList.add("active");

      const center = map.getCenter();
      const zoom = map.getZoom();
      map.setStyle(makeStyle(state.basemap));

      map.once("style.load", () => {
        addPvLayers();
        map.jumpTo({ center, zoom });
        applyMapViewMode(state.basemap, { animate: true });
      });
    });
  });

  ui.fitGlobal.addEventListener("click", () => {
    map.fitBounds(mapBoundsFromMetadata(state.metadata), {
      padding: 40,
      duration: 800,
    });
    window.setTimeout(() => {
      applyMapViewMode(state.basemap, { animate: true });
    }, 820);
  });

  ui.downloadVisible.addEventListener("click", downloadVisibleFeatures);
}

function wireCollapsibles() {
  document.querySelectorAll(".panel-collapsible").forEach((section) => {
    section.addEventListener("toggle", () => {
      if (!section.open || !previewMap) {
        return;
      }

      if (section.querySelector("#sidebar-globe")) {
        window.setTimeout(() => {
          if (previewMap) {
            previewMap.resize();
          }
        }, 80);
      }
    });
  });
}

function startIntroBlink() {
  if (introBlinkPlayed || !map || !map.getLayer("pv-points") || !map.getLayer("pv-points-glow")) {
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const pointStyle = getPointStyle();
  const blink = pointStyle.blink;
  if (!blink?.enabled || !pointStyle.showGlow) {
    return;
  }

  introBlinkPlayed = true;
  const durationMs = blink.durationMs;
  const start = performance.now();

  const animate = (now) => {
    if (!map || !map.getLayer("pv-points") || !map.getLayer("pv-points-glow")) {
      return;
    }

    const progress = Math.min(1, (now - start) / durationMs);
    const envelope = Math.pow(1 - progress, blink.decayPower);
    const wave = 0.5 + 0.5 * Math.sin(progress * Math.PI * blink.waveFactor);
    const intensity = envelope * wave;
    const glowOpacity = pointStyle.glowOpacity + intensity * blink.glowOpacityBoost;
    const coreOpacity = pointStyle.coreOpacity + intensity * blink.coreOpacityBoost;
    const glowBlur = Math.max(
      pointStyle.glowBlur - blink.glowBlurDrop,
      pointStyle.glowBlur - intensity * blink.glowBlurDrop,
    );
    const coreScale = 1 + intensity * blink.coreScaleBoost;
    const glowScale = 1 + intensity * blink.glowScaleBoost;

    map.setPaintProperty("pv-points-glow", "circle-opacity", glowOpacity);
    map.setPaintProperty("pv-points-glow", "circle-blur", glowBlur);
    map.setPaintProperty("pv-points-glow", "circle-radius", radiusExpression(pointStyle.glowRadiusStops, glowScale));
    map.setPaintProperty("pv-points", "circle-opacity", coreOpacity);
    map.setPaintProperty("pv-points", "circle-radius", radiusExpression(pointStyle.coreRadiusStops, coreScale));

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    applyPointStyleToMap(pointStyle);
  };

  requestAnimationFrame(animate);
}

function startPolygonBlinkLoop() {
  if (polygonBlinkStarted || !map || (!map.getLayer("pv-outline") && !map.getLayer("pv-points"))) {
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  polygonBlinkStarted = true;
  const cycleMs = 2200;

  const animate = (now) => {
    if (!map) {
      polygonBlinkStarted = false;
      return;
    }

    const phase = (now % cycleMs) / cycleMs;
    const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    const outlineOpacityScale = 0.64 + pulse * 0.42;
    const outlineWidthScale = 0.88 + pulse * 0.48;
    const pointsOpacity = 0.2 + pulse * 0.76;
    const pointsGlowOpacity = 0.04 + pulse * 0.52;
    const pointsScale = 0.72 + pulse * 1.25;
    const pointsGlowScale = 1.05 + pulse * 1.85;
    const pointsStroke = 0.08 + pulse * 0.38;

    if (map.getLayer("pv-outline")) {
      map.setPaintProperty("pv-outline", "line-opacity", opacityExpression(POLYGON_OUTLINE_OPACITY_STOPS, outlineOpacityScale));
      map.setPaintProperty("pv-outline", "line-width", radiusExpression(POLYGON_OUTLINE_WIDTH_STOPS, outlineWidthScale));
    }
    if (map.getLayer("pv-points")) {
      map.setPaintProperty("pv-points", "circle-opacity", pointsOpacity);
      map.setPaintProperty("pv-points", "circle-radius", radiusExpression(POINT_RADIUS_STOPS, pointsScale));
      map.setPaintProperty("pv-points", "circle-stroke-width", pointsStroke);
    }
    if (map.getLayer("pv-points-glow")) {
      map.setPaintProperty("pv-points-glow", "circle-opacity", pointsGlowOpacity);
      map.setPaintProperty("pv-points-glow", "circle-radius", radiusExpression(POINT_RADIUS_STOPS, pointsGlowScale));
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

function startIntroSpin() {
  if (introSpinPlayed || !map) {
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  introSpinPlayed = true;
  introSpinCancelled = false;

  const start = performance.now();
  const durationMs = 9500;
  const center = map.getCenter();
  const initialLng = center.lng;
  const fixedLat = center.lat;
  const shortestToUk = ((((UK_CENTER_LNG - initialLng) % 360) + 540) % 360) - 180;
  const direction = shortestToUk === 0 ? 1 : Math.sign(shortestToUk);
  const totalLngTravel = shortestToUk + 360 * direction;

  const animate = (now) => {
    if (!map || introSpinCancelled) {
      return;
    }

    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 1.25);
    const lng = initialLng + totalLngTravel * eased;
    map.jumpTo({ center: [lng, fixedLat] });

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }
    map.jumpTo({ center: [UK_CENTER_LNG, fixedLat] });
  };

  requestAnimationFrame(animate);
}

function startPreviewLoop() {
  if (previewLoopStarted || !previewMap) {
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  previewLoopStarted = true;
  const start = performance.now();
  const cycleMs = 2400;
  const centerLat = 20;

  const animate = (now) => {
    if (!previewMap) {
      previewLoopStarted = false;
      return;
    }

    const elapsedSec = (now - start) / 1000;
    const lng = 15 + elapsedSec * 10;
    const pulse = 0.5 + 0.5 * Math.sin(((now % cycleMs) / cycleMs) * Math.PI * 2);

    if (previewMap.getLayer("preview-points")) {
      previewMap.setPaintProperty("preview-points", "circle-opacity", 0.2 + pulse * 0.76);
      previewMap.setPaintProperty("preview-points", "circle-radius", radiusExpression(POINT_RADIUS_STOPS, 0.75 + pulse * 1.2));
      previewMap.setPaintProperty("preview-points", "circle-stroke-width", 0.08 + pulse * 0.34);
    }
    if (previewMap.getLayer("preview-points-glow")) {
      previewMap.setPaintProperty("preview-points-glow", "circle-opacity", 0.05 + pulse * 0.5);
      previewMap.setPaintProperty("preview-points-glow", "circle-radius", radiusExpression(POINT_RADIUS_STOPS, 1 + pulse * 1.8));
    }

    previewMap.jumpTo({ center: [lng, centerLat] });
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

function yearColor(year) {
  if (!state.metadata || !year) return null;
  const min = state.metadata.year_range.min;
  const max = state.metadata.year_range.max;
  const span = Math.max(max - min, 1);
  const idx = Math.round(((year - min) / span) * (YEAR_COLORS.length - 1));
  return YEAR_COLORS[Math.max(0, Math.min(idx, YEAR_COLORS.length - 1))];
}

function showYearColors() {
  if (!map) return;
  const expr = colorExpression(state.metadata.year_range.min, state.metadata.year_range.max);
  if (map.getLayer("pv-fill")) {
    map.setPaintProperty("pv-fill", "fill-color", expr);
    map.setPaintProperty("pv-fill", "fill-opacity", 0.35);
  }
  if (map.getLayer("pv-outline")) {
    map.setPaintProperty("pv-outline", "line-color", expr);
  }
  state.yearColorsVisible = true;
}

function hideYearColors() {
  if (!map) return;
  if (map.getLayer("pv-fill")) {
    map.setPaintProperty("pv-fill", "fill-opacity", 0);
  }
  if (map.getLayer("pv-outline")) {
    map.setPaintProperty("pv-outline", "line-color", "#ff2f2f");
  }
  state.yearColorsVisible = false;
  ui.featureCard.classList.add("hidden");
}

function showFeature(feature) {
  const p = feature.properties || {};
  ui.fcPvid.textContent = p.PV_ID ?? "-";
  ui.fcCountry.textContent = p.country ?? "-";
  ui.fcArea.textContent = p.area_m2 ? fmtAreaM2(Number(p.area_m2)) : "-";
  ui.fcLat.textContent = p.latitude ? Number(p.latitude).toFixed(5) : "-";
  ui.fcLon.textContent = p.longitude ? Number(p.longitude).toFixed(5) : "-";

  const yr = p.year;
  const color = yearColor(Number(yr));
  if (color) {
    ui.fcYear.innerHTML = `<span class="swatch" style="background:${color};display:inline-block;vertical-align:middle;margin-right:6px"></span>${yr}`;
  } else {
    ui.fcYear.textContent = yr ?? "-";
  }

  showYearColors();
  ui.featureCard.classList.remove("hidden");
}

function bindMapEvents() {
  const cancelSpin = () => {
    introSpinCancelled = true;
  };

  map.on("dragstart", cancelSpin);
  map.on("zoomstart", cancelSpin);
  map.on("rotatestart", cancelSpin);
  map.on("pitchstart", cancelSpin);
  map.on("mousedown", cancelSpin);
  map.on("touchstart", cancelSpin);

  map.on("mousemove", "pv-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mousemove", "pv-outline", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mousemove", "pv-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "pv-fill", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseleave", "pv-outline", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseleave", "pv-points", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["pv-outline", "pv-fill", "pv-points"],
    });

    if (!features.length) {
      if (state.yearColorsVisible) {
        hideYearColors();
      }
      return;
    }

    if (state.yearColorsVisible) {
      hideYearColors();
    } else {
      showFeature(features[0]);
    }
  });

  map.on("sourcedata", (e) => {
    if (e.sourceId === "pv" && e.isSourceLoaded) {
      pvSourceLive = true;
      setStatus("");
    }
  });

  map.on("zoomend", () => {
    if (map.getZoom() < POLYGON_MIN_ZOOM) {
      ui.toolbarTitle.textContent = `Global PV sites as red points (${fmtInt(state.metadata.feature_count)} total). Zoom in for polygons.`;
      return;
    }
    ui.toolbarTitle.textContent = `3D Earth with blinking PV polygons (${fmtInt(state.metadata.feature_count)} sites)`;
  });

  map.on("error", (e) => {
    const msg = e?.error?.message || "Map rendering error";
    if (msg.includes("404") || msg.includes("Failed to fetch") || msg.includes("network")) {
      setStatus(
        "PV tiles are not loading. Start local tile server and verify config.js vectorTilesUrl/sourceLayer.",
      );
    }
  });
}

function downloadVisibleFeatures() {
  if (!map) {
    setStatus("Map is not ready yet for export.");
    return;
  }

  const features = map.queryRenderedFeatures({ layers: ["pv-outline", "pv-fill", "pv-points"] });
  if (!features.length) {
    setStatus("No visible features to export in the current viewport.");
    return;
  }

  const seen = new Set();
  const output = [];

  features.forEach((feature) => {
    const props = feature.properties || {};
    const key = `${props.PV_ID ?? "na"}|${props.country ?? "na"}|${props.year ?? "na"}`;

    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    output.push({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        PV_ID: props.PV_ID,
        country: props.country,
        year: props.year,
        area_m2: props.area_m2,
        latitude: props.latitude,
        longitude: props.longitude,
      },
    });
  });

  const featureCollection = {
    type: "FeatureCollection",
    features: output,
    metadata: {
      exported_at_utc: new Date().toISOString(),
      note: "Visible rendered features only; geometry may be tile-clipped.",
      zoom: map.getZoom(),
      bounds: map.getBounds().toArray(),
    },
  };

  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: "application/geo+json",
  });

  const ymd = new Date().toISOString().slice(0, 10);
  const fileName = `pv_visible_subset_${ymd}.geojson`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus(`Downloaded ${fmtInt(output.length)} visible features as ${fileName}.`);
}

async function loadMetadata() {
  const response = await fetch(CONFIG.metadataUrl);
  if (!response.ok) {
    throw new Error(`metadata fetch failed: ${response.status}`);
  }
  return response.json();
}

function hydrateSummary(meta) {
  const years = meta.year_range;
  ui.metricFacilities.textContent = fmtInt(meta.feature_count);
  ui.metricCountries.textContent = fmtInt(meta.countries_count);
  ui.metricYears.textContent = `${years.min} to ${years.max}`;
  ui.metricArea.textContent = `${(meta.area_m2.total / 1_000_000).toFixed(0)} km²`;
  buildLegend(meta);
}

function initMap(meta) {
  const initialBasemap = BASEMAPS[state.basemap] || BASEMAPS.cinematic;
  const mapElement = document.getElementById("map");
  mapElement?.classList.remove("map-ready");

  map = new maplibregl.Map({
    container: "map",
    style: makeStyle(state.basemap),
    projection: "mercator",
    center: [15, 20],
    zoom: 1.45,
    maxZoom: PV_TILE_MAX_ZOOM + 2,
    maxPitch: 70,
    renderWorldCopies: false,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

  map.once("load", () => {
    addPvLayers();
    bindMapEvents();
    map.fitBounds(mapBoundsFromMetadata(meta), { padding: 34, duration: 0 });
    applyMapViewMode(state.basemap, { animate: false });

    // Prevent initial flat-map flash by revealing only after globe projection is applied.
    let projectionChecks = 0;
    const revealWhenReady = () => {
      projectionChecks += 1;
      const projection = typeof map.getProjection === "function" ? map.getProjection() : null;
      const isGlobe = projection && (projection.type === "globe" || projection.name === "globe");
      if (isGlobe || projectionChecks >= 28) {
        mapElement?.classList.add("map-ready");
        return;
      }
      requestAnimationFrame(revealWhenReady);
    };
    requestAnimationFrame(revealWhenReady);

    ui.toolbarTitle.textContent = `Global PV sites as red points (${fmtInt(state.metadata.feature_count)} total). Zoom in for polygons.`;
    window.setTimeout(startPolygonBlinkLoop, 500);
    window.setTimeout(startIntroSpin, 650);
  });

  window.setTimeout(() => {
    if (!pvSourceLive) {
      setStatus(
        "No vector-tile response detected yet. If needed, start Martin and verify config.js vectorTilesUrl/sourceLayer.",
      );
    }
  }, 5000);
}

function initSidebarPreview() {
  if (!ui.sidebarGlobe || typeof maplibregl === "undefined") {
    return;
  }
  ui.sidebarGlobe.classList.remove("preview-ready");

  previewMap = new maplibregl.Map({
    container: "sidebar-globe",
    style: makeStyle(state.basemap),
    projection: "mercator",
    center: [15, 20],
    zoom: 1.25,
    maxZoom: 4,
    interactive: false,
    attributionControl: false,
    renderWorldCopies: false,
    fadeDuration: 0,
  });

  previewMap.once("load", () => {
    addPreviewLayers(previewMap);
    applyMapViewModeFor(previewMap, state.basemap, { animate: false, cameraOverride: { pitch: 16, bearing: -8 } });
    let projectionChecks = 0;
    const revealWhenReady = () => {
      projectionChecks += 1;
      const projection = typeof previewMap.getProjection === "function" ? previewMap.getProjection() : null;
      const isGlobe = projection && (projection.type === "globe" || projection.name === "globe");
      if (isGlobe || projectionChecks >= 28) {
        ui.sidebarGlobe.classList.add("preview-ready");
        return;
      }
      requestAnimationFrame(revealWhenReady);
    };
    requestAnimationFrame(revealWhenReady);
    startPreviewLoop();
  });
}

async function boot() {
  try {
    initLinks();
    initTheme();
    state.metadata = await loadMetadata();
    hydrateSummary(state.metadata);
    wireControls();
    wireCollapsibles();
    initMap(state.metadata);
    initSidebarPreview();
  } catch (error) {
    console.error(error);
    setStatus("Failed to initialize dashboard. Check metadata.json and config.js.");
  }
}

boot();

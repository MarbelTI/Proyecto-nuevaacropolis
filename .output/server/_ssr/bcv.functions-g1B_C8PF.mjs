import { Buffer } from "node:buffer";
import { c as createServerRpc } from "./createServerRpc-BozI-sf8.mjs";
import { a as createServerFn } from "./server-CzQV3pgX.mjs";
import https from "node:https";

import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { g as objectType, h as numberType, j as stringType } from "../_libs/zod.mjs";

import "../_libs/h3-v2.mjs";
import "../_libs/unenv.mjs";

import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";




import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";

import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "../_libs/isbot.mjs";
const bcvAgent = new https.Agent({
  rejectUnauthorized: false
});
function bcvUrlCandidates(year, quarter) {
  const yy = String(year % 100).padStart(2, "0");
  const letters = ["a", "b", "c", "d", "e"];
  const prefixCandidates = ["2_1_2", "1_1_2"];
  const out = [];
  for (const prefix of prefixCandidates) {
    const L = letters[quarter - 1];
    if (L) out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L}${yy}_smc.xls`);
    for (const L2 of letters) {
      out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L2}${yy}_smc.xls`);
    }
    out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${yy}_smc.xls`);
  }
  return [...new Set(out)];
}
function quarterOf(month) {
  return Math.floor((month - 1) / 3) + 1;
}
function sheetNameToIso(name) {
  const m = name.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function fetchXlsBuffer(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      agent: bcvAgent,
      headers: {
        "User-Agent": "Mozilla/5.0 SISFIA"
      }
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(15e3, () => {
      req.destroy();
      resolve(null);
    });
  });
}
async function readXlsRates(buf) {
  const XLSX = await import("../_libs/xlsx.mjs");
  const wb = XLSX.read(buf, {
    type: "array"
  });
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const iso = sheetNameToIso(sheetName);
    if (!iso) continue;
    const ws = wb.Sheets[sheetName];
    const cell = ws["G15"];
    const rate = typeof cell?.v === "number" ? cell.v : Number(cell?.v);
    if (rate && rate > 1) rows.push({
      isoDate: iso,
      rate
    });
  }
  return rows.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}
async function fetchQuarterRows(year, quarter) {
  for (const url of bcvUrlCandidates(year, quarter)) {
    const buf = await fetchXlsBuffer(url);
    if (!buf) continue;
    const rows = await readXlsRates(buf);
    if (rows.length) return {
      rows,
      source: url
    };
  }
  return null;
}
const QuarterInput = objectType({
  year: numberType().int().min(2020).max(2100),
  quarter: numberType().int().min(1).max(4)
});
const fetchBcvQuarter_createServerFn_handler = createServerRpc({
  id: "dcce5d829b3a45e9d81e3406ace1bfa4fe99b1a35a4ed5f9ccef09a2485183ec",
  name: "fetchBcvQuarter",
  filename: "src/lib/bcv.functions.ts"
}, (opts) => fetchBcvQuarter.__executeServer(opts));
const fetchBcvQuarter = createServerFn({
  method: "POST"
}).inputValidator((d) => QuarterInput.parse(d)).handler(fetchBcvQuarter_createServerFn_handler, async ({
  data
}) => {
  const res = await fetchQuarterRows(data.year, data.quarter);
  return res;
});
const DateInput = objectType({
  isoDate: stringType().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const fetchBcvForDate_createServerFn_handler = createServerRpc({
  id: "97ba995ab05f4535cc62dffb0f302cacb232ef85718217b5d414399d79112e9a",
  name: "fetchBcvForDate",
  filename: "src/lib/bcv.functions.ts"
}, (opts) => fetchBcvForDate.__executeServer(opts));
const fetchBcvForDate = createServerFn({
  method: "POST"
}).inputValidator((d) => DateInput.parse(d)).handler(fetchBcvForDate_createServerFn_handler, async ({
  data
}) => {
  const [ys, ms] = data.isoDate.split("-");
  const y = Number(ys), m = Number(ms);
  const q = quarterOf(m);
  const res = await fetchQuarterRows(y, q);
  if (res) return res;
  try {
    const alt = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (alt.ok) {
      const j = await alt.json();
      if (j.promedio) {
        const iso = (j.fechaActualizacion ?? (/* @__PURE__ */ new Date()).toISOString()).slice(0, 10);
        return {
          rows: [{
            isoDate: iso,
            rate: j.promedio
          }],
          source: "dolarapi.com"
        };
      }
    }
  } catch {
  }
  return null;
});
const fetchTodayBcv_createServerFn_handler = createServerRpc({
  id: "89c5997d61a574f97b6f398f7bf6f1e8f6e83007e7f854d9375024f4816dc8d6",
  name: "fetchTodayBcv",
  filename: "src/lib/bcv.functions.ts"
}, (opts) => fetchTodayBcv.__executeServer(opts));
const fetchTodayBcv = createServerFn({
  method: "GET"
}).handler(fetchTodayBcv_createServerFn_handler, async () => {
  const d = /* @__PURE__ */ new Date();
  const y = d.getFullYear();
  const q = quarterOf(d.getMonth() + 1);
  const res = await fetchQuarterRows(y, q);
  if (res && res.rows.length) {
    const last = res.rows[res.rows.length - 1];
    return {
      isoDate: last.isoDate,
      rate: last.rate
    };
  }
  try {
    const alt = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!alt.ok) return null;
    const j = await alt.json();
    if (!j.promedio) return null;
    const iso = (j.fechaActualizacion ?? (/* @__PURE__ */ new Date()).toISOString()).slice(0, 10);
    return {
      isoDate: iso,
      rate: j.promedio
    };
  } catch {
    return null;
  }
});
export {
  fetchBcvForDate_createServerFn_handler,
  fetchBcvQuarter_createServerFn_handler,
  fetchTodayBcv_createServerFn_handler
};

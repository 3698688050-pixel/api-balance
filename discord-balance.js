// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: coins;

/**
 * Discord 余额 · 带缓存与刷新的桌面组件
 *
 * 三层刷新，各管一段：
 *   1) 缓存时间戳  —— 5 分钟内不碰网络，防止被 API 限流
 *   2) refreshAfterDate —— 向系统「请求」5 分钟后重跑（系统不保证，通常 15 分钟起）
 *   3) 点击组件     —— 走 widget.url 打开本脚本，在 App 内强制刷新
 *
 * 第一次在 App 里运行会弹窗问你要「接口地址」和「Token」，填完存本地，以后不用再管。
 */

// ═══════════════════════ 配置（不用改代码） ═══════════════════════
// 接口地址和 Token 存在本地文件里，第一次运行时弹窗问你。
const DEFAULTS = {
  maxAge: 5 * 60 * 1000,     // 缓存有效期：5 分钟
  timeout: 10,               // 网络超时（秒）
  accent: "#5865F2",         // Discord 蓝紫
};

const fm = FileManager.local();
const cfgPath = fm.joinPath(fm.documentsDirectory(), "discord-balance-config.json");

/** 读配置。没有文件 / 读坏了，都返回 null。 */
function readConfig() {
  try {
    if (!fm.fileExists(cfgPath)) return null;
    const o = JSON.parse(fm.readString(cfgPath));
    return (o && o.apiUrl && o.token) ? o : null;
  } catch (e) { return null; }
}

/** 写配置。 */
function writeConfig(o) {
  try { fm.writeString(cfgPath, JSON.stringify(o)); } catch (e) {}
}

// ═══════════════════════ 缓存层 ═══════════════════════
const cachePath = fm.joinPath(fm.documentsDirectory(), "discord-balance-cache.json");

/** 读缓存。文件不存在、内容损坏、格式不对，一律返回 null，绝不抛错。 */
function readCache() {
  try {
    if (!fm.fileExists(cachePath)) return null;
    const raw = fm.readString(cachePath);
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== "number" || !obj.data) return null;
    return obj;
  } catch (e) {
    return null; // 首次运行没文件、或写坏了，都按「无缓存」处理
  }
}

/** 写缓存。写失败不影响本次展示，所以只吞掉错误。 */
function writeCache(data) {
  try {
    fm.writeString(cachePath, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) { /* 磁盘满 / 权限问题，忽略 */ }
}

// ═══════════════════════ 取数层 ═══════════════════════
/** 真正请求一次接口。任何异常都向上抛，由调用方决定用什么兜底。 */
async function fetchBalance(cfg) {
  const req = new Request(cfg.apiUrl);
  req.timeoutInterval = DEFAULTS.timeout;               // 组件里不能卡死，10 秒必须回来
  req.headers = {
    Authorization: "Bearer " + cfg.token,
    Accept: "application/json",
  };

  const text = await req.loadString();             // 超时 / 断网 在这里抛
  const code = req.response ? req.response.statusCode : 0;

  if (code === 401 || code === 403) throw new Error("Token 无效");
  if (code !== 200) throw new Error("HTTP " + code);

  return parseBalance(JSON.parse(text));
}

/**
 * ⚠️ 唯一需要按你的接口改的函数。
 * 现在的写法兼容最常见的两种返回：
 *   { "balance": 12.34, "currency": "USD" }
 *   { "data": { "balance": 12.34 } }
 */
function parseBalance(json) {
  // ① DeepSeek 官方接口：{ is_available, balance_infos: [{ currency, total_balance, ... }] }
  const infos = json.balance_infos;
  if (Array.isArray(infos) && infos.length) {
    const i = infos[0];
    return {
      amount: Number(i.total_balance),
      currency: i.currency || "",
      granted: i.granted_balance,
      topped: i.topped_up_balance,
    };
  }

  // ② 兜底：常见字段名都试一遍
  const flat = [json, json.data, json.result, json.account].filter(Boolean);
  const keys = ["balance", "credits", "credit", "amount", "remaining", "quota", "money"];
  let raw = null;
  for (const obj of flat) {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) { raw = obj[k]; break; }
    }
    if (raw !== null) break;
  }
  if (raw === null && typeof json === "number") raw = json;
  if (raw === null) {
    throw new Error("认不出余额字段，原始返回：" + JSON.stringify(json).slice(0, 160));
  }
  const src = flat.find(o => o.currency || o.unit) || {};
  return { amount: Number(raw), currency: src.currency || src.unit || "" };
}

// ═══════════════════════ 时间格式 ═══════════════════════
function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return m + " 分钟前";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " 小时前";
  return Math.floor(h / 24) + " 天前";
}

// ═══════════════════════ 渲染层 ═══════════════════════
function paint(data, meta) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#15161a");
  w.setPadding(12, 12, 12, 12);

  // 点击组件 → 打开 Scriptable 并运行本脚本（App 内会强制刷新）
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name());

  // 请求 5 分钟后重跑。系统只当作建议，实际由 iOS 调度
  w.refreshAfterDate = new Date(Date.now() + DEFAULTS.maxAge);

  // 上下弹性空隔 = 垂直居中（不用已废弃的 centerAlignContent）
  w.addSpacer();

  const head = w.addText(data ? formatMoney(data) : "—");
  head.font = Font.boldSystemFont(config.widgetFamily === "medium" ? 32 : 24);
  head.textColor = new Color(meta.error ? "#ff6b6b" : DEFAULTS.accent);
  head.centerAlignText();
  head.lineLimit = 1;
  head.minimumScaleFactor = 0.5;

  w.addSpacer(4);

  const label = w.addText("DeepSeek 余额");
  label.font = Font.systemFont(10);
  label.textColor = new Color("#8b919e");
  label.centerAlignText();

  w.addSpacer(6);

  // 底部一行永远说明数据新旧，避免「卡在旧数据上还以为是真的」
  let note;
  if (meta.error && meta.fromCache) note = "获取失败 · 显示 " + ago(meta.ts);
  else if (meta.error) note = "获取失败 · " + meta.error;
  else if (meta.fromCache) note = "缓存 · " + ago(meta.ts);
  else note = "已更新 · " + ago(meta.ts);

  const foot = w.addText(note);
  foot.font = Font.systemFont(9);
  foot.textColor = new Color(meta.error ? "#ff8a8a" : "#6f7581");
  foot.centerAlignText();

  w.addSpacer();
  return w;
}

function formatMoney(d) {
  const n = Number(d.amount);
  const v = isFinite(n) ? n.toFixed(2) : String(d.amount);
  const sym = d.currency === "USD" ? "$" : d.currency === "CNY" ? "¥" : "";
  return sym ? sym + v : v;
}

// ═══════════════════════ 主流程 ═══════════════════════
(async () => {
const inApp = !config.runsInWidget;   // 在 Scriptable App 里跑 = true

/** 弹窗问配置。返回 {apiUrl, token} 或 null（用户取消）。 */
async function askConfig(cur) {
  const a = new Alert();
  a.title = cur ? "重新填写" : "首次配置";
  a.message = "填一次，存在这台设备上，以后不用再填。";
  a.addTextField("接口地址，https://...", cur ? cur.apiUrl : "");
  a.addTextField("Token", cur ? cur.token : "");
  a.addAction("保存");
  a.addCancelAction("取消");

  if (await a.present() !== 0) return null;

  const out = {
    apiUrl: a.textFieldValue(0).trim(),
    token: a.textFieldValue(1).trim(),
  };
  if (!out.apiUrl || !out.token) return null;
  writeConfig(out);
  return out;
}

let cfg = readConfig();

if (!cfg && inApp) {
  cfg = await askConfig(null);
  if (!cfg) {
    const bad = new Alert();
    bad.title = "没填完";
    bad.message = "接口地址和 Token 都要填。再运行一次脚本即可重填。";
    bad.addAction("好");
    await bad.present();
    Script.complete();
    return;
  }
}

// 组件里跑但还没配置过：直接给出提示，不联网
if (!cfg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#15161a");
  w.setPadding(12, 12, 12, 12);
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name());
  w.addSpacer();
  const t = w.addText("未配置");
  t.font = Font.boldSystemFont(14);
  t.textColor = new Color("#8b919e");
  t.centerAlignText();
  w.addSpacer(6);
  const d = w.addText("点一下 · 去 App 里运行本脚本");
  d.font = Font.systemFont(9);
  d.textColor = new Color("#6f7581");
  d.centerAlignText();
  w.addSpacer();
  Script.setWidget(w);
  Script.complete();
  return;
}

const cache = readCache();
const isFresh = !!cache && Date.now() - cache.ts < DEFAULTS.maxAge;

let data = null;
let meta = { ts: Date.now(), fromCache: false, error: null };

if (!inApp && isFresh) {
  data = cache.data;
  meta = { ts: cache.ts, fromCache: true, error: null };
} else {
  try {
    data = await fetchBalance(cfg);
    writeCache(data);
    meta = { ts: Date.now(), fromCache: false, error: null };
  } catch (e) {
    // 401/403 时把 token 的指纹带出来，方便你对比是不是贴错了
    let msg = e.message;
    if (/Token/.test(msg)) {
      const t = cfg.token;
      msg += "（你填的：长度 " + t.length + "，开头 " + t.slice(0, 6) + "…，结尾 …" + t.slice(-4) + "）";
    }
    if (cache) {
      data = cache.data;
      meta = { ts: cache.ts, fromCache: true, error: msg };
    } else {
      data = null;
      meta = { ts: Date.now(), fromCache: false, error: msg };
    }
  }
}

const widget = paint(data, meta);
Script.setWidget(widget);

if (inApp) {
  const a = new Alert();
  const needFix = !!meta.error && /Token/.test(meta.error);

  if (meta.error) {
    a.title = "刷新失败";
    a.message = meta.error + (data ? "\n\n界面继续显示缓存（" + ago(meta.ts) + "）。" : "");
  } else {
    a.title = "刷新成功";
    a.message = (data ? formatMoney(data) : "无数据") +
                "\n更新于 " + new Date().toLocaleTimeString("zh-CN");
  }

  if (needFix) a.addAction("重新填写");
  a.addAction("好");

  const idx = await a.present();

  // 点了「重新填写」：重来一遍，成功就立刻再查一次
  if (needFix && idx === 0) {
    const again = await askConfig(cfg);
    if (again) {
      try {
        const d2 = await fetchBalance(again);
        writeCache(d2);
        const ok = new Alert();
        ok.title = "这次通了";
        ok.message = formatMoney(d2);
        ok.addAction("好");
        await ok.present();
        await paint(d2, { ts: Date.now(), fromCache: false, error: null }).presentMedium();
        Script.complete();
        return;
      } catch (e2) {
        const fail = new Alert();
        fail.title = "还是不行";
        fail.message = e2.message;
        fail.addAction("好");
        await fail.present();
      }
    }
  }

  await widget.presentMedium();
}

Script.complete();
})();

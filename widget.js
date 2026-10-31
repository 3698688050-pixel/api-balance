// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-orange; icon-glyph: wallet;

/* DeepSeek 余额 · 桌面小组件
 * 首次运行会问一次 API Key，存进钥匙串；之后只读不写。
 * 小尺寸：总额度。中尺寸：再列赠送 / 充值。点一下打开网页版。
 */

const KEYCHAIN = "deepseek.balance.key";
const API = "https://api.deepseek.com/user/balance";
const PAGE = "https://3698688050-pixel.github.io/api-balance/";

const INK = "#e8eae5", STEEL = "#9aa39c", WORD = "#ffd84d", GROUND = "#131614";

// —— 纯函数：解析与格式化，可在 node 里单独测 ——
function pickInfo(json) {
  const list = (json && json.balance_infos) || [];
  return list[0] || null;
}
function fmt(info) {
  if (!info || !info.currency) return null;
  const cur = info.currency === "USD" ? "$" : "¥";
  return {
    total: cur + info.total_balance,
    granted: cur + info.granted_balance,
    topped: cur + info.topped_up_balance,
    ok: true
  };
}

// —— 取数 ——
async function fetchBalance(key) {
  const req = new Request(API);
  req.headers = { Authorization: "Bearer " + key };
  try {
    const json = await req.loadJSON();
    return fmt(pickInfo(json));
  } catch (e) {
    return null;
  }
}

// —— 画 ——
function paint(data, label) {
  const w = new ListWidget();
  w.backgroundColor = new Color(GROUND);
  w.setPadding(14, 16, 14, 16);
  w.url = PAGE;
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  if (data) {
    const head = w.addText(data.total);
    head.font = Font.systemFont(config.widgetFamily === "medium" ? 30 : 24);
    head.textColor = new Color(WORD);
    head.minimumScaleFactor = 0.6;

    w.addSpacer(4);
    const sub = w.addText(label || "DeepSeek");
    sub.font = Font.systemFont(10);
    sub.textColor = new Color(STEEL);

    if (config.widgetFamily === "medium") {
      w.addSpacer(6);
      const line = w.addText("赠送 " + data.granted + "   充值 " + data.topped);
      line.font = Font.systemFont(11);
      line.textColor = new Color(STEEL);
    }
  } else {
    const t = w.addText("未配置");
    t.font = Font.boldSystemFont(15);
    t.textColor = new Color(WORD);
    w.addSpacer(4);
    const d = w.addText(label || "点开填 Key");
    d.font = Font.systemFont(10);
    d.textColor = new Color(STEEL);
  }

  w.addSpacer();
  return w;
}

// —— 主流程 ——
let key = Keychain.get(KEYCHAIN);

if (!key && !config.runsInWidget) {
  const a = new Alert();
  a.title = "DeepSeek API Key";
  a.message = "只存在这台设备的钥匙串里。";
  a.addTextField("sk-...", "");
  a.addAction("保存");
  a.addCancelAction("取消");
  if (await a.present() === 0) {
    key = a.textFieldValue(0).trim();
    if (key) Keychain.set(KEYCHAIN, key);
  }
}

const data = key ? await fetchBalance(key) : null;
const w = paint(data, key ? "DeepSeek" : "未配置 · 长按运行");
Script.setWidget(w);
if (!config.runsInWidget) await w.presentMedium();
Script.complete();

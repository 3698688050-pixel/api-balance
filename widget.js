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

// DeepSeek 品牌蓝 + 白底
const BLUE = "#4d6bfe", BG = "#ffffff", GRAY = "#8a8f98", RED = "#d92d20";

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
  let text;
  try { text = await req.loadString(); } catch (e) { return { err: "查询失败" }; }
  const code = req.response ? req.response.statusCode : 0;
  if (code === 401) return { err: "Key 无效" };
  if (code !== 200) return { err: "HTTP " + code };
  try { return fmt(pickInfo(JSON.parse(text))) || { err: "返回异常" }; }
  catch (e) { return { err: "解析失败" }; }
}

// —— 画 ——
function paint(data, label) {
  const w = new ListWidget();
  w.backgroundColor = new Color(BG);
  w.setPadding(12, 10, 12, 10);
  w.url = PAGE;
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  // 上下各一个弹性空隔 = 内容垂直居中（centerAlignContent() 在部分版本已被移除）
  w.addSpacer();

  const big = config.widgetFamily === "medium" ? 34 : 26;

  if (data && data.err) {
    const t = w.addText(data.err);
    t.font = Font.boldSystemFont(14);
    t.textColor = new Color(RED);
    t.centerAlignText();

    w.addSpacer(6);
    const d = w.addText("长按组件 · 运行脚本");
    d.font = Font.systemFont(9);
    d.textColor = new Color(GRAY);
    d.centerAlignText();

  } else if (!data) {
    const t = w.addText("未配置");
    t.font = Font.boldSystemFont(14);
    t.textColor = new Color(GRAY);
    t.centerAlignText();

    w.addSpacer(6);
    const d = w.addText(label || "点开填 Key");
    d.font = Font.systemFont(9);
    d.textColor = new Color(GRAY);
    d.centerAlignText();

  } else {
    const head = w.addText(data.total);
    head.font = Font.boldSystemFont(big);
    head.textColor = new Color(BLUE);
    head.centerAlignText();
    head.lineLimit = 1;
    head.minimumScaleFactor = 0.5;

    w.addSpacer(4);
    const sub = w.addText(label || "DeepSeek");
    sub.font = Font.systemFont(10);
    sub.textColor = new Color(GRAY);
    sub.centerAlignText();

    if (config.widgetFamily === "medium") {
      w.addSpacer(6);
      const line = w.addText("赠送 " + data.granted + "　充值 " + data.topped);
      line.font = Font.systemFont(10);
      line.textColor = new Color(GRAY);
      line.centerAlignText();
    }
  }

  w.addSpacer();
  return w;
}

// —— 主流程 ——
let key = null;
try { key = Keychain.get(KEYCHAIN); } catch (e) { key = null; }   // 键不存在时 Scriptable 会抛，不是返回 null

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

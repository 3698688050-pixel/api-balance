/**
 * 壁纸助手 · Scriptable
 *
 * 先说明为什么这个脚本不能「真的」换壁纸：
 *   iOS 的公开 API 里没有设置壁纸的接口，Scriptable 的 Device 类也只有
 *   batteryLevel / screenBrightness / systemVersion 这些只读属性，
 *   没有、也永远不会有 setWallpaper。这是 iOS 沙盒限制，不是 Scriptable 的问题。
 *
 * 所以这个脚本做的是「把选图到设置之间能自动的部分全自动掉」：
 *   选图 → 立刻弹出系统预览（分享面板里有「用作墙纸」）→ 你点两下完成。
 *   比每次都去照片 App 里翻要快，但最后那一下必须你按，这是系统规定。
 *
 * 运行方式：在 Scriptable 里跑本脚本即可，不需要参数。
 */

(async () => {
  // ─────────────────────────────────────────────
  // 1. 第一层菜单：让用户选入口
  // ─────────────────────────────────────────────
  const menu = new Alert();
  menu.title = "设置壁纸";
  menu.message =
    "iOS 不允许 App 直接改壁纸。\n选好图后，在分享面板点「用作墙纸」，最后两下由你完成。";
  menu.addAction("从相册选一张");   // → 索引 0
  menu.addAction("直接打开照片 App"); // → 索引 1
  menu.addCancelAction("取消");       // → 索引 -1

  const choice = await menu.present();

  // 用户主动取消：安静退出，不弹第二个框
  if (choice === -1) {
    Script.complete();
    return;
  }

  // ─────────────────────────────────────────────
  // 2a. 分支：直接打开照片 App（什么都不改，只是省一步翻页）
  // ─────────────────────────────────────────────
  if (choice === 1) {
    // photos-redirect:// 是系统内置的「打开照片」URL Scheme
    Safari.open("photos-redirect://");
    Script.complete();
    return;
  }

  // ─────────────────────────────────────────────
  // 2b. 分支：从相册选图
  // ─────────────────────────────────────────────
  let img = null;
  try {
    // 选图时用户点「取消」，Promise 会 reject，必须接住
    img = await Photos.fromLibrary();
  } catch (e) {
    img = null;
  }

  // 取消：给一句友好提示后安全退出
  if (!img) {
    const cancel = new Alert();
    cancel.title = "没有选图";
    cancel.message = "已取消，壁纸和相册都没有任何改动。";
    cancel.addAction("好");
    await cancel.present();
    Script.complete();
    return;
  }

  // 拿到图以后，用系统预览打开它。
  // QuickLook 的分享面板在 iOS 16 及以上带「用作墙纸」，
  // 同时也能「存储图像」「拷贝」——用户想干嘛都行。
  try {
    await QuickLook.present(img, false);
  } catch (e) {
    // 预览本身失败（极少数情况），退回到最稳的路径：打开照片 App 自己找
    const fail = new Alert();
    fail.title = "打开预览失败";
    fail.message = "错误：" + e.message + "\n已改为打开照片 App，请在那里设置壁纸。";
    fail.addAction("打开照片");
    fail.addCancelAction("算了");
    if (await fail.present() === 0) {
      Safari.open("photos-redirect://");
    }
  }

  Script.complete();
})();

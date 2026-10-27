// The phone remote: one page, no build step, installable (Add to Home Screen). Paired by the TV's QR code
// (#<id>.<key> in the address), which the page keeps in localStorage and moves to /?p=<id>.<key>: there the
// server links a manifest whose start_url is that address, since iOS starts a home-screen app at start_url
// with storage of its own (and reads the manifest before any script could change the link).
// A WebSocket to the relay (/phone) keeps the status live: controls go away while the TV is offline and
// come back the moment it is on. Commands go through run(cmd, {text, args}); the TV's building blocks
// (sony, button, intent, launch, apps, global, local, info) let new features live here alone.
// The look follows the launcher (Apple TV style): Outfit, black with a warm ambient glow, glass panels with
// a hairline border, spaced capitals for labels, white for the chosen or main action.
// (No backticks or dollar-brace in the script below: this file is one template literal.)
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="TV Remote">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preload" href="/outfit.ttf" as="font" type="font/ttf" crossorigin>
<title>TV Remote</title>
<style>
  @font-face { font-family:"Outfit"; src:url("/outfit.ttf") format("truetype"); font-weight:100 900; font-display:swap; }
  :root {
    --text:#fff; --dim:rgba(235,235,245,.62); --faint:rgba(235,235,245,.32);
    --glass:linear-gradient(180deg, rgba(44,44,48,.62), rgba(22,22,24,.72));
    --key:rgba(255,255,255,.08); --key-on:rgba(255,255,255,.16); --hair:rgba(255,255,255,.14);
    --ok:#34c759; --bad:#ff453a; --warn:#ff9f0a;
    --tabbar:calc(64px + env(safe-area-inset-bottom));
  }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  [hidden] { display:none !important; }
  html, body { overflow-x:hidden; max-width:100%; -webkit-text-size-adjust:100%; text-size-adjust:100%; }
  body { margin:0; min-height:100vh; color:var(--text); background:#000;
         font:16px/1.4 "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         padding:calc(env(safe-area-inset-top) + 18px) 16px calc(var(--tabbar) + 18px); }
  /* The ambient glow behind Home, here warm and soft. */
  body::before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
         background:radial-gradient(90% 55% at 18% -8%, rgba(255,92,38,.34), transparent 62%),
                    radial-gradient(70% 45% at 105% 8%, rgba(120,70,255,.16), transparent 60%), #000; }
  main { max-width:520px; margin:0 auto; }
  button { font:inherit; color:inherit; border:0; cursor:pointer; background:none; padding:0; }
  button:disabled { opacity:.4; }
  svg { display:block; }

  .eyebrow { font-size:12px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--dim); }
  header { margin:8px 2px 20px; }
  header .hrow { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
  #greeting { line-height:1.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  header h1 { min-width:0; margin:2px 0 0; padding-bottom:4px; font-size:34px; font-weight:300; letter-spacing:-.01em; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .status { flex:0 0 auto; display:flex; align-items:center; gap:8px; height:34px; padding:0 14px; border-radius:17px; font-size:14px; font-weight:500;
            background:var(--glass); border:1px solid var(--hair); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--faint); }
  .status.on .dot { background:var(--ok); box-shadow:0 0 8px rgba(52,199,89,.7); } .status.off .dot { background:var(--bad); }
  .status.standby .dot { background:var(--warn); }

  .card { position:relative; background:var(--glass); border:1px solid var(--hair); border-radius:22px; padding:18px;
          margin-bottom:14px; -webkit-backdrop-filter:blur(24px) saturate(140%); backdrop-filter:blur(24px) saturate(140%); }
  .card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; }
  .hint { font-size:13px; color:var(--dim); margin:12px 0 0; line-height:1.45; }
  .hint b { color:var(--text); font-weight:500; }

  /* Glass pills; white is the main action, like the focused pill on the TV. */
  .pill { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:48px; padding:0 20px; border-radius:24px;
          background:var(--key); border:1px solid var(--hair); font-weight:500; font-size:16px; transition:background .15s, transform .1s; }
  .pill:active, .key:active { transform:scale(.97); background:var(--key-on); }
  .pill.white { background:#f5f5f7; color:#0b0b0d; border-color:transparent; }
  .pill.white:active { background:#fff; }
  .pill.red { color:#ff6961; }
  .pill.sm { height:40px; padding:0 16px; font-size:15px; }
  .pill.icon { width:48px; padding:0; }
  .row { display:flex; gap:10px; margin-top:12px; }
  .row > .pill { flex:1; }
  .row > *, .card-head > * { min-width:0; }

  textarea, input[type=text], input[type=password], input[type=number], input[type=url] {
    width:100%; background:rgba(0,0,0,.35); color:var(--text); border:1px solid var(--hair); border-radius:16px; padding:13px 15px;
    font:inherit; font-size:17px; -webkit-appearance:none; appearance:none; }
  textarea { min-height:110px; resize:none; }
  textarea:focus, input:focus { outline:none; border-color:rgba(255,255,255,.5); }
  input::placeholder, textarea::placeholder { color:var(--faint); }
  .count { font-size:12px; color:var(--faint); text-align:right; margin-top:6px; font-variant-numeric:tabular-nums; }

  /* Bottom tab bar, iOS style. */
  nav.tabs { position:fixed; left:0; right:0; bottom:0; z-index:5; display:flex; justify-content:space-around;
             padding:8px 6px calc(6px + env(safe-area-inset-bottom)); background:rgba(18,18,20,.72);
             -webkit-backdrop-filter:blur(24px) saturate(160%); backdrop-filter:blur(24px) saturate(160%); border-top:1px solid rgba(255,255,255,.08); }
  nav.tabs button { flex:1; max-width:96px; display:flex; flex-direction:column; align-items:center; gap:3px; color:var(--faint);
                    font-size:10.5px; font-weight:500; letter-spacing:.02em; padding:2px 0; }
  nav.tabs button.sel { color:var(--text); }
  body.tv-off nav.tabs button[data-tab="remote"], body.tv-off nav.tabs button[data-tab="message"],
  body.tv-off nav.tabs button[data-tab="lock"], body.tv-off nav.tabs button[data-tab="activity"] { opacity:.35; }

  .offline { text-align:center; padding:28px 18px; }
  .offline .big { width:52px; height:52px; margin:0 auto 12px; color:var(--dim); }
  .offline b { display:block; font-size:20px; font-weight:500; margin-bottom:6px; }
  .offline span { color:var(--dim); font-size:14px; }
  body.tv-off .needs-tv { display:none; }

  /* Remote */
  .screen { position:relative; aspect-ratio:16/9; background:#000; border-radius:14px; overflow:hidden; border:1px solid rgba(255,255,255,.08); }
  /* Full screen: the real Fullscreen API where the browser has it, this overlay where it doesn't (iPhone). */
  .screen.full { position:fixed; inset:0; z-index:20; aspect-ratio:auto; border-radius:0; border:0; }
  .screen .exit { position:absolute; top:max(12px, env(safe-area-inset-top)); right:12px; z-index:2; width:44px; height:44px; border-radius:22px;
                  background:rgba(0,0,0,.45); color:#fff; display:none; align-items:center; justify-content:center; }
  .screen.full .exit { display:flex; }
  .screen img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
  .screen .msg { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; padding:16px; color:var(--dim); font-size:14px; }
  .remote button { touch-action:manipulation; user-select:none; -webkit-user-select:none; display:flex; align-items:center; justify-content:center; }
  .ring { position:relative; width:min(270px, 74vw); aspect-ratio:1; margin:6px auto 0; border-radius:50%;
          background:radial-gradient(circle at 50% 35%, rgba(255,255,255,.12), rgba(255,255,255,.05)); border:1px solid var(--hair); }
  .ring .arrow { position:absolute; width:34%; height:34%; border-radius:50%; color:var(--dim); }
  .ring .arrow:active { color:#fff; background:rgba(255,255,255,.06); }
  .ring .up { top:0; left:33%; } .ring .down { bottom:0; left:33%; } .ring .left { left:0; top:33%; } .ring .right { right:0; top:33%; }
  .ring .ok { position:absolute; inset:30%; border-radius:50%; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.18);
              font-size:17px; font-weight:500; letter-spacing:.12em; }
  .ring .ok:active { background:#f5f5f7; color:#0b0b0d; }
  .line { display:flex; align-items:center; justify-content:center; gap:14px; margin-top:20px; }
  .key { flex:0 0 auto; width:58px; height:58px; border-radius:50%; background:var(--key); border:1px solid var(--hair); transition:background .15s, transform .1s; }
  .key.big { width:74px; height:74px; }
  .key.white { background:#f5f5f7; color:#0b0b0d; border-color:transparent; }
  .rocker { flex:0 1 220px; display:flex; align-items:stretch; height:58px; border-radius:29px; background:var(--key); border:1px solid var(--hair); overflow:hidden; }
  .rocker button { flex:1; }
  .rocker button:active { background:var(--key-on); }
  .rocker button + button { border-left:1px solid rgba(255,255,255,.08); }
  .rocker .tag { align-self:center; font-size:11px; font-weight:600; letter-spacing:.2em; color:var(--faint); padding:0 6px 0 8px; }
  .power { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; }
  .power button { display:flex; flex-direction:column; align-items:center; gap:7px; padding:12px 2px 10px; border-radius:18px; background:var(--key);
                  border:1px solid var(--hair); font-size:11.5px; color:var(--dim); line-height:1.15; text-align:center; }
  .power button svg { color:var(--text); }
  .power button.red svg { color:#ff6961; }
  .power button.green { background:rgba(52,199,89,.2); border-color:rgba(52,199,89,.45); color:#fff; }
  .power button.green svg { color:#4cd964; }
  .power button:active { background:var(--key-on); }

  /* Lock */
  .lockface { display:flex; align-items:center; gap:16px; }
  .lockface .badge { width:56px; height:56px; border-radius:18px; display:flex; align-items:center; justify-content:center; background:var(--key); border:1px solid var(--hair); }
  .lockface.locked .badge { background:rgba(255,69,58,.18); color:#ff6961; border-color:rgba(255,69,58,.35); }
  .lockface .state { font-size:24px; font-weight:400; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .countdown { font-size:64px; font-weight:200; letter-spacing:-.02em; line-height:1; font-variant-numeric:tabular-nums; text-align:center; margin:6px 0 4px; }

  /* Activity: one series, one hue, thin bars rounded at the data end. */
  .seg { display:flex; background:rgba(0,0,0,.35); border:1px solid var(--hair); border-radius:14px; padding:3px; gap:3px; }
  .seg button { padding:7px 14px; border-radius:11px; color:var(--dim); font-weight:500; font-size:14px; white-space:nowrap; }
  .seg button.sel { background:#f5f5f7; color:#0b0b0d; }
  .total { font-size:52px; font-weight:200; letter-spacing:-.02em; line-height:1; font-variant-numeric:tabular-nums; }
  .chart { position:relative; display:flex; align-items:flex-end; gap:2px; height:130px; margin-top:18px; border-bottom:1px solid var(--hair); }
  .chart .b { flex:1; display:flex; align-items:flex-end; height:100%; cursor:pointer; }
  .chart .b i { display:block; width:100%; min-height:1px; background:var(--warn); border-radius:4px 4px 0 0; opacity:.9; }
  .chart .b.sel i { opacity:1; background:#ffc266; }
  .axis { display:flex; justify-content:space-between; font-size:11px; color:var(--faint); margin-top:6px; }
  .tip { position:absolute; top:-6px; transform:translate(-50%,-100%); background:rgba(40,40,44,.95); border:1px solid var(--hair); border-radius:10px; padding:4px 9px; font-size:12px; white-space:nowrap; pointer-events:none; }
  .apps { margin-top:16px; display:flex; flex-direction:column; gap:2px; }
  .st-head { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
  .st-head .eyebrow { margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .st-head > div { min-width:0; }
  .st-head .total { font-size:clamp(34px, 11vw, 48px); white-space:nowrap; }
  .st-head .pill { flex:0 0 auto; white-space:nowrap; }
  .apps .app { display:block; width:100%; text-align:left; padding:10px 12px; margin:0 -12px; width:calc(100% + 24px); border-radius:14px; }
  .apps .app:active { background:rgba(255,255,255,.06); }
  .apps .app.sel { background:rgba(255,255,255,.1); }
  .app .top { display:flex; justify-content:space-between; font-size:15px; gap:10px; }
  .app .top span:last-child { color:var(--dim); font-variant-numeric:tabular-nums; }
  .app .bar { height:5px; background:rgba(255,255,255,.08); border-radius:99px; margin-top:7px; overflow:hidden; }
  .app .bar i { display:block; height:100%; background:var(--warn); border-radius:99px; }

  /* Settings: grouped rows. */
  .group { padding:4px 0; }
  .setting { display:flex; align-items:center; gap:14px; padding:14px 18px; }
  .setting + .setting, .setting + .sub, .sub + .setting { border-top:1px solid rgba(255,255,255,.08); }
  .setting .ic { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--key); flex:0 0 auto; }
  .setting .txt { flex:1; min-width:0; }
  .setting .txt b { display:block; font-weight:500; }
  .setting .txt span { display:block; font-size:13px; color:var(--dim); overflow-wrap:anywhere; -webkit-user-select:text; user-select:text; }
  .sub { padding:0 18px 16px 66px; }
  .steps { font-size:13px; color:var(--dim); margin:4px 0 12px; padding-left:18px; }
  .steps li { margin:5px 0; } .steps b { color:var(--text); font-weight:500; }
  .switch { appearance:none; -webkit-appearance:none; width:51px; height:31px; border-radius:99px; background:rgba(120,120,128,.36); position:relative; flex:0 0 auto; cursor:pointer; transition:.2s; border:0; padding:0; }
  .switch::after { content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%; background:#fff; transition:.2s; box-shadow:0 2px 6px rgba(0,0,0,.3); }
  .switch:checked { background:var(--ok); } .switch:checked::after { left:22px; }
  /* AI agents: the new key once, then one row per agent with its two switches. */
  .keybox { margin-top:14px; padding:14px; border-radius:16px; background:rgba(52,199,89,.12); border:1px solid rgba(52,199,89,.4); }
  .keybox code { display:block; margin-top:8px; padding:11px 13px; border-radius:12px; background:rgba(0,0,0,.4); border:1px solid var(--hair);
                 font:13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; word-break:break-all; -webkit-user-select:all; user-select:all; }
  #agentList .setting { border-top:1px solid rgba(255,255,255,.08); }
  .perm { display:flex; align-items:center; gap:12px; padding:8px 0; }
  .perm .txt { flex:1; min-width:0; font-size:15px; }
  .perm .txt small { display:block; font-size:12.5px; color:var(--dim); }
  .perm .txt small.warn { color:var(--warn); margin-top:2px; }
  .agentlog { list-style:none; margin:0; padding:0; font-size:13px; color:var(--dim); }
  .agentlog li { display:flex; gap:8px; padding:5px 0; } .agentlog li + li { border-top:1px solid rgba(255,255,255,.06); }
  .agentlog .when { flex:0 0 auto; font-variant-numeric:tabular-nums; color:var(--faint); }
  .agentlog .what { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .agentlog .bad { color:#ff6961; }

  .empty { text-align:center; padding:40px 10px; color:var(--dim); }
  .empty .big { width:64px; height:64px; margin:0 auto 16px; color:var(--text); }
  .empty b { display:block; color:var(--text); font-size:24px; font-weight:400; margin-bottom:10px; }

  #toast { position:fixed; left:50%; bottom:calc(var(--tabbar) + 14px); transform:translateX(-50%) translateY(16px); opacity:0; z-index:9;
           background:rgba(44,44,48,.92); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); border:1px solid var(--hair);
           padding:11px 18px; border-radius:22px; font-size:15px; transition:.22s; max-width:calc(100% - 32px); pointer-events:none; }
  #toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  #toast.bad { border-color:rgba(255,69,58,.6); }
</style>
</head>
<body class="tv-off">
<main>
  <header>
    <div class="eyebrow" id="greeting">TV Remote</div>
    <div class="hrow">
      <h1 id="title">TV Remote</h1>
      <span class="status" id="status"><span class="dot"></span><span id="statusText">…</span></span>
    </div>
  </header>

  <div id="unpaired" class="card empty" hidden>
    <i class="big" data-i="tv"></i>
    <b data-i18n="unp_title">Not paired yet</b>
    <span data-i18n="unp_text">On the TV, hold OK on the Wi-Fi button at the top of the Home screen and scan the QR code with this phone.</span>
    <p style="margin:24px 0 0" data-i18n="unp_paste">Or paste the QR code's link (in the camera, hold the link and copy it):</p>
    <div class="row">
      <input id="pairLink" type="url" autocomplete="off" placeholder="https://tv-remote…/#…" style="flex:1">
      <button class="pill white" id="pairBtn" style="flex:0 0 auto" data-i18n="pair">Pair</button>
    </div>
  </div>

  <div id="paired" hidden>
    <section class="card offline" id="offlineCard">
      <i class="big" data-i="tvoff"></i>
      <b id="offlineTitle" data-i18n="connecting_title">Connecting to the TV…</b>
      <span id="offlineText" data-i18n="connecting_text">The controls appear as soon as the TV answers.</span>
    </section>

    <!-- Remote -->
    <div class="tab" id="tab-remote">
      <section class="card needs-tv">
        <div class="card-head">
          <span class="eyebrow" data-i18n="live_view">Live view</span>
          <div style="display:flex;gap:8px">
            <button class="pill sm icon" id="liveFull" aria-label="Full screen" data-i18n-aria-label="a_full" style="width:40px"><i data-i="expand"></i></button>
            <button class="pill sm icon" id="liveToggle" aria-label="Show or hide the live view" data-i18n-aria-label="a_live_toggle" style="width:40px"><i data-i="eye"></i></button>
          </div>
        </div>
        <div id="liveBox">
          <div class="screen" id="liveScreen"><img id="liveImg" alt=""><div class="msg" id="liveMsg" data-i18n="live_starting">Starting the live view…</div>
            <button class="exit" id="liveExit" aria-label="Leave full screen" data-i18n-aria-label="a_exit_full"><i data-i="shrink"></i></button></div>
          <p class="hint" data-i18n="live_hint">About two pictures a second through the relay, smoother on the home network. Netflix and other protected video, HDMI and the tuner show black.</p>
        </div>
      </section>

      <section class="card needs-tv remote" style="padding:24px 16px 20px">
        <div class="ring">
          <button class="arrow up" data-key="Up" data-repeat aria-label="Up" data-i18n-aria-label="a_up"><i data-i="up"></i></button>
          <button class="arrow left" data-key="Left" data-repeat aria-label="Left" data-i18n-aria-label="a_left"><i data-i="left"></i></button>
          <button class="arrow right" data-key="Right" data-repeat aria-label="Right" data-i18n-aria-label="a_right"><i data-i="right"></i></button>
          <button class="arrow down" data-key="Down" data-repeat aria-label="Down" data-i18n-aria-label="a_down"><i data-i="down"></i></button>
          <button class="ok" id="okBtn" aria-label="OK, hold for the long press" data-i18n-aria-label="a_ok">OK</button>
        </div>
        <div class="line">
          <button class="key" data-key="Return" aria-label="Back" data-i18n-aria-label="a_back"><i data-i="back"></i></button>
          <button class="key big" data-key="Home" aria-label="Home" data-i18n-aria-label="a_home"><i data-i="home"></i></button>
          <button class="key white" data-key="ActionMenu|Options|SyncMenu" aria-label="Menu" data-i18n-aria-label="a_menu"><i data-i="menu"></i></button>
        </div>
        <div class="line">
          <button class="key" data-key="Mute" aria-label="Mute" data-i18n-aria-label="a_mute"><i data-i="mute"></i></button>
          <div class="rocker"><button data-key="VolumeDown" data-repeat aria-label="Volume down" data-i18n-aria-label="a_vdown"><i data-i="vdown"></i></button><button data-key="VolumeUp" data-repeat aria-label="Volume up" data-i18n-aria-label="a_vup"><i data-i="vup"></i></button></div>
        </div>
        <div class="line">
          <button class="key" id="kbOpen" aria-label="Keyboard" data-i18n-aria-label="a_kb"><i data-i="kb"></i></button>
          <div class="rocker"><button data-key="ChannelDown" data-repeat aria-label="Channel down" data-i18n-aria-label="a_chdown"><i data-i="minus"></i></button><span class="tag" data-i18n="ch_tag">CH</span><button data-key="ChannelUp" data-repeat aria-label="Channel up" data-i18n-aria-label="a_chup"><i data-i="plus"></i></button></div>
        </div>
      </section>

      <section class="card needs-tv" id="kb" hidden>
        <div class="card-head"><span class="eyebrow" data-i18n="keyboard">Keyboard</span><button class="pill sm" id="kbClose" data-i18n="done_btn">Done</button></div>
        <textarea id="kbText" placeholder="Type or paste. It appears in the TV's selected text field." data-i18n-placeholder="kb_ph" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
        <div class="row">
          <button class="pill white" id="kbEnter"><i data-i="enter"></i><span data-i18n="enter">Enter</span></button>
          <button class="pill icon" id="kbClear" aria-label="Clear" data-i18n-aria-label="a_clear"><i data-i="x"></i></button>
        </div>
        <p class="hint" data-i18n="kb_hint">Select a text field on the TV first. What you type replaces its text as you go.</p>
      </section>

      <section class="card needs-tv">
        <div class="card-head"><span class="eyebrow" data-i18n="power">Power</span></div>
        <div id="ipSetup" hidden style="margin-bottom:14px">
          <p class="hint" style="margin-top:0" id="ipSetupText" data-i18n="ip_setup_new">These use the TV's IP control, which isn't set up yet. On the TV:</p>
          <ol class="steps">
            <li data-i18n-html="step1"><b>Settings › Network &amp; Internet › Remote device settings › Control remotely</b>: On.</li>
            <li data-i18n-html="step2"><b>Settings › Network &amp; Internet › Home network › IP control › Authentication</b>: Normal and Pre-Shared Key.</li>
            <li data-i18n-html="step3"><b>Pre-Shared Key</b> (same menu): any key, for example 4 digits.</li>
            <li data-i18n="step4_here">Enter the same key here.</li>
          </ol>
          <div class="row" style="margin-top:0">
            <input id="psk2" type="password" autocomplete="off" maxlength="64" placeholder="Pre-Shared Key" data-i18n-placeholder="psk_ph" style="flex:1">
            <button class="pill white" id="savePsk2" style="flex:0 0 auto" data-i18n="save">Save</button>
          </div>
        </div>
        <div class="power">
          <button id="btnPicture"><i id="pictureIcon" data-i="screenoff"></i><span id="pictureLabel" data-i18n="screen_off">Screen off</span></button>
          <button data-cmd="standby" class="red" id="btnStandby"><i data-i="power"></i><span data-i18n="standby">Standby</span></button>
          <button data-cmd="wake" class="green" id="btnWake" hidden><i data-i="power"></i><span data-i18n="turn_on">Turn on</span></button>
        </div>
        <p class="hint" data-i18n="power_hint">Screen off blanks the picture but keeps the TV running, so Screen on always works. From standby the TV may not hear Turn on.</p>
      </section>
    </div>

    <!-- Message -->
    <div class="tab" id="tab-message" hidden>
      <section class="card needs-tv">
        <div class="card-head"><span class="eyebrow" data-i18n="msg_title">Message on the TV</span></div>
        <textarea id="text" maxlength="500" placeholder="Dinner is ready!" data-i18n-placeholder="msg_ph"></textarea>
        <div class="count"><span id="count">0</span>/500</div>
        <div class="row">
          <button class="pill white" id="send"><i data-i="send"></i><span data-i18n="show_on_tv">Show on TV</span></button>
          <button class="pill icon" id="clear" aria-label="Clear the message on the TV" data-i18n-aria-label="a_clear_msg"><i data-i="x"></i></button>
        </div>
        <p class="hint" data-i18n="msg_hint">The TV goes to Home and shows the message in large type until someone presses OK. The ✕ button takes it off.</p>
      </section>
    </div>

    <!-- Lock -->
    <div class="tab" id="tab-lock" hidden>
      <section class="card needs-tv">
        <div class="lockface" id="lockFace">
          <div class="badge"><i id="lockIcon" data-i="unlock"></i></div>
          <div><div class="eyebrow" data-i18n="tv_is">This TV is</div><div class="state" id="lockBadge" data-i18n="unlocked">Unlocked</div></div>
        </div>
        <div class="row" style="margin-top:18px">
          <button class="pill white" id="lockNow"><i data-i="lock"></i><span data-i18n="lock">Lock</span></button>
          <button class="pill" id="unlockNow"><i data-i="unlock"></i><span data-i18n="unlock">Unlock</span></button>
        </div>
        <p class="hint" id="noPin" data-i18n="no_pin" hidden>Set a 4-digit PIN in Settings first.</p>
      </section>
      <section class="card needs-tv">
        <div class="card-head"><span class="eyebrow" data-i18n="lock_timer">Lock timer</span><i data-i="timer" style="color:var(--dim)"></i></div>
        <div id="timerRun" hidden>
          <div class="countdown" id="countdown">0:00</div>
          <p class="hint" style="text-align:center;margin-top:0" data-i18n="until_locks">until the TV locks</p>
          <div class="row"><button class="pill" id="timerCancel" data-i18n="cancel_timer">Cancel timer</button></div>
        </div>
        <div id="timerSet">
          <div class="chips" id="chips">
            <button class="pill sm" data-min="15" data-i18n="min_n" data-i18n-args="[15]">15 min</button><button class="pill sm" data-min="30" data-i18n="min_n" data-i18n-args="[30]">30 min</button><button class="pill sm" data-min="45" data-i18n="min_n" data-i18n-args="[45]">45 min</button>
            <button class="pill sm" data-min="60" data-i18n="h_n" data-i18n-args="[1]">1 h</button><button class="pill sm" data-min="90" data-i18n="h_m" data-i18n-args="[1,30]">1 h 30</button><button class="pill sm" data-min="120" data-i18n="h_n" data-i18n-args="[2]">2 h</button>
          </div>
          <div class="row">
            <input id="minutes" type="number" inputmode="numeric" min="1" max="720" placeholder="Minutes" data-i18n-placeholder="minutes_ph" style="flex:1">
            <button class="pill white" id="timerStart" style="flex:0 0 auto" data-i18n="start">Start</button>
          </div>
          <p class="hint" data-i18n="timer_hint">The TV counts down in a corner, then locks. The PIN unlocks it.</p>
        </div>
      </section>
    </div>

    <!-- Activity -->
    <div class="tab" id="tab-activity" hidden>
      <section class="card needs-tv">
        <div class="card-head">
          <span class="eyebrow" data-i18n="screen_time">Screen time</span>
          <div class="seg" id="range"><button data-r="today" class="sel" data-i18n="today">Today</button><button data-r="7d" data-i18n="days7">7 days</button></div>
        </div>
        <div id="stBody"><p class="hint" style="margin:0" data-i18n="loading">Loading…</p></div>
      </section>
    </div>

    <!-- Settings -->
    <div class="tab" id="tab-settings" hidden>
      <section class="card group">
        <div class="setting">
          <span class="ic"><i data-i="bell"></i></span>
          <div class="txt"><b data-i18n="notifications">Notifications</b><span id="notifyHint" data-i18n="notify_hint">When the TV turns on or off</span></div>
          <input type="checkbox" class="switch" id="notify" aria-label="Notify me when the TV turns on or off" data-i18n-aria-label="a_notify">
        </div>
        <div class="setting" id="notifyOffRow" hidden>
          <span class="ic"><i data-i="power"></i></span>
          <div class="txt"><b data-i18n="when_off">When it turns off</b><span data-i18n="when_off_hint">Off: only when the TV turns on</span></div>
          <input type="checkbox" class="switch" id="notifyOff" aria-label="Also notify me when the TV turns off" data-i18n-aria-label="a_notify_off">
        </div>
        <div class="setting" id="install" hidden>
          <span class="ic"><i data-i="add"></i></span>
          <div class="txt"><b data-i18n="add_home">Add to Home Screen</b><span id="installHint"></span></div>
          <button class="pill sm white" id="installBtn" data-i18n="install" hidden>Install</button>
        </div>
      </section>

      <section class="card group needs-tv">
        <div class="setting">
          <span class="ic"><i data-i="key"></i></span>
          <div class="txt"><b data-i18n="pin_title">PIN</b><span data-i18n="pin_hint">Unlocks the TV; also its App lock PIN</span></div>
        </div>
        <div class="sub">
          <div class="row" style="margin-top:0">
            <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 digits" data-i18n-placeholder="pin_ph" style="flex:1">
            <button class="pill white" id="savePin" style="flex:0 0 auto" data-i18n="save">Save</button>
          </div>
        </div>
        <div class="setting">
          <span class="ic"><i data-i="plug"></i></span>
          <div class="txt"><b data-i18n="psk_title">Sony IP control key</b><span data-i18n="psk_hint">For Screen off/on, standby and the remote keys</span></div>
        </div>
        <div class="sub">
          <ol class="steps">
            <li data-i18n-html="step1"><b>Settings › Network &amp; Internet › Remote device settings › Control remotely</b>: On.</li>
            <li data-i18n-html="step2"><b>Settings › Network &amp; Internet › Home network › IP control › Authentication</b>: Normal and Pre-Shared Key.</li>
            <li data-i18n-html="step3"><b>Pre-Shared Key</b> (same menu): any key, for example 4 digits.</li>
            <li data-i18n="step4_below">Enter the same key below.</li>
          </ol>
          <div class="row" style="margin-top:0">
            <input id="psk" type="password" autocomplete="off" maxlength="64" placeholder="Pre-Shared Key" data-i18n-placeholder="psk_ph" style="flex:1">
            <button class="pill white" id="savePsk" style="flex:0 0 auto" data-i18n="save">Save</button>
          </div>
        </div>
      </section>

      <section class="card group needs-tv" id="adbCard" hidden>
        <div class="setting">
          <span class="ic"><i data-i="terminal"></i></span>
          <div class="txt"><b>ADB</b><span id="adbHint" data-i18n="adb_default">Wireless debugging</span></div>
          <input type="checkbox" class="switch" id="adbSwitch" aria-label="ADB over the network" data-i18n-aria-label="a_adb">
        </div>
      </section>

      <section class="card group needs-tv" id="agentsCard" hidden>
        <div class="setting">
          <span class="ic"><i data-i="bot"></i></span>
          <div class="txt"><b data-i18n="agents">AI agents</b><span data-i18n="agents_hint">An assistant such as Claude uses this TV with a key of its own</span></div>
        </div>
        <div class="sub">
          <div class="row" style="margin-top:0">
            <input id="agentName" type="text" maxlength="40" autocomplete="off" placeholder="Name, e.g. Claude" data-i18n-placeholder="agent_name_ph" style="flex:1">
            <button class="pill white" id="agentCreate" style="flex:0 0 auto" data-i18n="create">Create</button>
          </div>
          <div class="keybox" id="agentKeyBox" hidden>
            <b id="agentKeyTitle" data-i18n="key_copy_now">Copy the key now</b>
            <p class="hint" style="margin-top:4px" data-i18n-html="key_once">It is shown only this once. The agent sends it as <b>Authorization: Bearer</b> (or <b>TV_AGENT_KEY</b> for the MCP server).</p>
            <code id="agentKey"></code>
            <div class="row">
              <button class="pill white" id="agentCopy"><i data-i="copy"></i><span data-i18n="copy_key">Copy key</span></button>
              <button class="pill icon" id="agentKeyHide" aria-label="Hide the key" data-i18n-aria-label="a_hide_key" style="flex:0 0 auto"><i data-i="x"></i></button>
            </div>
          </div>
          <p class="hint" id="agentPerms"></p>
        </div>
        <div id="agentList"></div>
        <div class="sub" id="agentLogBox" hidden style="padding-top:14px">
          <div class="eyebrow" style="margin-bottom:6px" data-i18n="agent_log">Recent agent commands</div>
          <ul class="agentlog" id="agentLog"></ul>
        </div>
      </section>

      <section class="card group">
        <div class="setting">
          <span class="ic"><i data-i="globe"></i></span>
          <div class="txt"><b data-i18n="language">Language</b><span data-i18n="language_hint">Auto follows the TV's language</span></div>
        </div>
        <div class="sub">
          <div class="chips" id="langPick">
            <button class="pill sm" data-lang="" data-i18n="lang_auto">Auto (from the TV)</button><button class="pill sm" data-lang="en" lang="en">English</button><button class="pill sm" data-lang="vi" lang="vi">Tiếng Việt</button><button class="pill sm" data-lang="zh" lang="zh-CN">中文</button>
          </div>
        </div>
      </section>

      <section class="card group">
        <div class="setting">
          <span class="ic" style="color:#ff6961"><i data-i="unlink"></i></span>
          <div class="txt"><b data-i18n="forget_title">Forget this TV</b><span data-i18n="forget_hint">Scan the QR code again to pair</span></div>
          <button class="pill sm red" id="forget" data-i18n="forget">Forget</button>
        </div>
      </section>
    </div>
  </div>
</main>

<nav class="tabs" id="tabs" hidden>
  <button data-tab="remote" class="sel"><i data-i="dpad"></i><span data-i18n="tab_remote">Remote</span></button>
  <button data-tab="message"><i data-i="chat"></i><span data-i18n="tab_message">Message</span></button>
  <button data-tab="lock"><i data-i="lock"></i><span data-i18n="tab_lock">Lock</span></button>
  <button data-tab="activity"><i data-i="chart"></i><span data-i18n="tab_activity">Activity</span></button>
  <button data-tab="settings"><i data-i="gear"></i><span data-i18n="tab_settings">Settings</span></button>
</nav>
<div id="toast"></div>
<script>
(() => {
  const $ = (id) => document.getElementById(id);

  // ---- i18n (begin) --------------------------------------------------------------------------------
  // English, Vietnamese and Simplified Chinese. t(key, a, b) fills {0}, {1}; a key missing in vi or zh falls
  // back to English. Brand and proper names (TV Remote, Netflix, PIN, ADB, Wi-Fi) stay as they are.
  const T = {
    en: {
      unp_title: "Not paired yet",
      unp_text: "On the TV, hold OK on the Wi-Fi button at the top of the Home screen and scan the QR code with this phone.",
      unp_paste: "Or paste the QR code's link (in the camera, hold the link and copy it):",
      pair: "Pair",
      connecting_title: "Connecting to the TV…",
      connecting_text: "The controls appear as soon as the TV answers.",
      live_view: "Live view",
      a_full: "Full screen",
      a_live_toggle: "Show or hide the live view",
      live_starting: "Starting the live view…",
      a_exit_full: "Leave full screen",
      live_hint: "About two pictures a second through the relay, smoother on the home network. Netflix and other protected video, HDMI and the tuner show black.",
      a_up: "Up", a_down: "Down", a_left: "Left", a_right: "Right",
      a_ok: "OK, hold for the long press",
      a_back: "Back", a_home: "Home", a_menu: "Menu", a_mute: "Mute",
      a_vdown: "Volume down", a_vup: "Volume up", a_kb: "Keyboard",
      a_chdown: "Channel down", a_chup: "Channel up", ch_tag: "CH",
      keyboard: "Keyboard", done_btn: "Done",
      kb_ph: "Type or paste. It appears in the TV's selected text field.",
      enter: "Enter", a_clear: "Clear",
      kb_hint: "Select a text field on the TV first. What you type replaces its text as you go.",
      power: "Power",
      ip_setup_new: "These use the TV's IP control, which isn't set up yet. On the TV:",
      ip_setup_refused: "The TV refuses the saved IP control key. Check it on the TV and enter it again:",
      step1: "<b>Settings › Network &amp; Internet › Remote device settings › Control remotely</b>: On.",
      step2: "<b>Settings › Network &amp; Internet › Home network › IP control › Authentication</b>: Normal and Pre-Shared Key.",
      step3: "<b>Pre-Shared Key</b> (same menu): any key, for example 4 digits.",
      step4_here: "Enter the same key here.",
      step4_below: "Enter the same key below.",
      psk_ph: "Pre-Shared Key", save: "Save",
      screen_off: "Screen off", screen_on: "Screen on", standby: "Standby", turn_on: "Turn on",
      power_hint: "Screen off blanks the picture but keeps the TV running, so Screen on always works. From standby the TV may not hear Turn on.",
      msg_title: "Message on the TV", msg_ph: "Dinner is ready!", show_on_tv: "Show on TV",
      a_clear_msg: "Clear the message on the TV",
      msg_hint: "The TV goes to Home and shows the message in large type until someone presses OK. The ✕ button takes it off.",
      tv_is: "This TV is", locked: "Locked", unlocked: "Unlocked", lock: "Lock", unlock: "Unlock",
      no_pin: "Set a 4-digit PIN in Settings first.",
      lock_timer: "Lock timer", until_locks: "until the TV locks", cancel_timer: "Cancel timer",
      minutes_ph: "Minutes", start: "Start",
      timer_hint: "The TV counts down in a corner, then locks. The PIN unlocks it.",
      screen_time: "Screen time", today: "Today", days7: "7 days", loading: "Loading…",
      notifications: "Notifications", notify_hint: "When the TV turns on or off",
      a_notify: "Notify me when the TV turns on or off",
      when_off: "When it turns off", when_off_hint: "Off: only when the TV turns on",
      a_notify_off: "Also notify me when the TV turns off",
      add_home: "Add to Home Screen", install: "Install",
      pin_title: "PIN", pin_hint: "Unlocks the TV; also its App lock PIN", pin_ph: "4 digits",
      psk_title: "Sony IP control key", psk_hint: "For Screen off/on, standby and the remote keys",
      adb_default: "Wireless debugging", a_adb: "ADB over the network",
      agents: "AI agents", agents_hint: "An assistant such as Claude uses this TV with a key of its own",
      agent_name_ph: "Name, e.g. Claude", create: "Create", key_copy_now: "Copy the key now",
      key_once: "It is shown only this once. The agent sends it as <b>Authorization: Bearer</b> (or <b>TV_AGENT_KEY</b> for the MCP server).",
      copy_key: "Copy key", a_hide_key: "Hide the key", agent_log: "Recent agent commands",
      language: "Language", language_hint: "Auto follows the TV's language", lang_auto: "Auto (from the TV)",
      forget_title: "Forget this TV", forget_hint: "Scan the QR code again to pair", forget: "Forget",
      tab_remote: "Remote", tab_message: "Message", tab_lock: "Lock", tab_activity: "Activity", tab_settings: "Settings",
      greet_night: "Good night", greet_morning: "Good morning", greet_afternoon: "Good afternoon", greet_evening: "Good evening",
      not_paired_again: "This phone is no longer paired. Scan the TV's QR code again.",
      just_now: "just now", min_ago: "{0} min ago", h_ago: "{0} h ago", days_ago: "{0} days ago",
      doc_title: "{0} · Remote",
      st_online: "Online", st_standby: "Standby", st_offline: "Offline", st_offline_ago: "Offline · {0}",
      st_not_paired: "Not paired", st_checking: "Checking…",
      phone_offline_title: "This phone is offline",
      phone_offline_text: "Check Wi-Fi or mobile data. The remote reconnects by itself when the connection is back.",
      tv_off_title: "The TV is off", tv_offline_title: "The TV is offline",
      last_seen_text: "Last seen {0}. The controls come back by themselves when it is on.",
      a_while_ago: "a while ago",
      tv_back: "The TV is back.", no_picture: "No picture.", no_picture_now: "No picture from the TV right now.",
      ok_done: "Done.", went_wrong: "Something went wrong.", no_conn: "No connection.",
      screen_on_done: "Screen on.", screen_off_done: "Screen off.",
      enter_key_first: "Enter the key first.", saved_on_tv: "Saved on the TV.", bad_key: "Incorrect key.",
      hold_ok_newer: "Holding OK needs a newer launcher on the TV.", sent: "Sent.",
      min_n: "{0} min", h_n: "{0} h", h_min: "{0} h {1} min", h_m: "{0} h {1}",
      report_fail: "Could not load the report.",
      need_usage: "The TV needs usage access for Screen time (the install script grants it).",
      all_apps: "All apps", in_7d: "in the last 7 days", today_l: "today", nothing_yet: "Nothing watched yet.",
      wd_on: "Wireless debugging on", wd_on_ip: "Wireless debugging on · {0}",
      adb_off_classic: "Off · classic ADB on {0}:5555", wd_off: "Wireless debugging off",
      switching_on: "Switching on…", switching_off: "Switching off…", adb_on: "ADB on.", adb_off: "ADB off.",
      perm_read: "Read", perm_read_summary: "Status, info, the TV's apps and screen time",
      perm_control: "Control", perm_control_summary: "Remote keys, typing, opening apps, power, messages and the lock",
      perm_adb: "ADB", perm_adb_summary: "Wireless debugging on or off, and its address",
      perm_adb_warning: "Anyone on the home network who is already paired can then connect.",
      agent_perms_text: "A new agent may read; control and ADB are switches on each agent (granting them asks for the TV's PIN). Guide for agents: {0}",
      perm_for: "{0} for {1}", ask_pin: "The TV's PIN, to grant {0} to {1}:",
      granted: "{0} granted.", taken: "{0} taken away.",
      used_ago: "Used {0}", not_used: "Not used yet", revoke: "Revoke",
      revoke_confirm: "Revoke {0}? Its key stops working at once.", revoked: "Revoked.", not_done: "not done",
      no_https: "This browser can't make a key here (it needs https).", agent_default: "Agent",
      agent_created: "Agent created.", key_for: "Key for {0}: copy it now",
      key_copied: "Key copied.", key_selected: "Selected: copy it from the menu.",
      notify_need_home: "Add to Home Screen first, then switch this on there",
      notify_cant: "This browser can't show notifications", notify_blocked: "Blocked in the phone's settings",
      notify_not_allowed: "Notifications were not allowed.", relay_refused: "The relay refused.",
      notify_on: "Notifications on.", notify_fail: "Could not switch notifications on.", notify_off: "Notifications off.",
      notify_first: "Switch notifications on first.", notify_both: "You will be told when the TV turns on or off.",
      notify_on_only: "Only when the TV turns on.", change_fail: "Could not change it.",
      bad_link: "That is not the TV's pairing link.", type_first: "Type a message first.",
      shown: "Shown on the TV.", cleared: "Cleared.", locked_done: "Locked.", unlocked_done: "Unlocked.",
      timer_started: "Timer started.", minutes_range: "1 to 720 minutes.", timer_cancelled: "Timer cancelled.",
      pin_4: "The PIN is 4 digits.", pin_saved: "PIN saved.",
      install_ios: "Share › Add to Home Screen opens it like an app", install_hint: "Open the remote like an app",
    },
    vi: {
      unp_title: "Chưa ghép đôi",
      unp_text: "Trên TV, giữ OK ở nút Wi-Fi trên cùng màn hình chính rồi quét mã QR bằng điện thoại này.",
      unp_paste: "Hoặc dán link của mã QR (trong camera, giữ vào link rồi sao chép):",
      pair: "Ghép đôi",
      connecting_title: "Đang kết nối với TV…",
      connecting_text: "Các nút điều khiển hiện ra ngay khi TV phản hồi.",
      live_view: "Xem trực tiếp",
      a_full: "Toàn màn hình",
      a_live_toggle: "Hiện hoặc ẩn hình trực tiếp",
      live_starting: "Đang mở hình trực tiếp…",
      a_exit_full: "Thoát toàn màn hình",
      live_hint: "Khoảng hai hình mỗi giây qua relay, mượt hơn trong mạng nhà. Netflix và video có bảo vệ khác, HDMI và truyền hình ăng-ten hiện màu đen.",
      a_up: "Lên", a_down: "Xuống", a_left: "Trái", a_right: "Phải",
      a_ok: "OK, giữ để nhấn lâu",
      a_back: "Quay lại", a_home: "Màn hình chính", a_menu: "Menu", a_mute: "Tắt tiếng",
      a_vdown: "Giảm âm lượng", a_vup: "Tăng âm lượng", a_kb: "Bàn phím",
      a_chdown: "Kênh trước", a_chup: "Kênh sau", ch_tag: "CH",
      keyboard: "Bàn phím", done_btn: "Xong",
      kb_ph: "Gõ hoặc dán. Chữ hiện ở ô nhập đang chọn trên TV.",
      enter: "Enter", a_clear: "Xóa",
      kb_hint: "Chọn một ô nhập chữ trên TV trước. Chữ bạn gõ sẽ thay nội dung ô đó ngay khi gõ.",
      power: "Nguồn",
      ip_setup_new: "Các nút này dùng điều khiển IP của TV, hiện chưa được thiết lập. Trên TV:",
      ip_setup_refused: "TV không nhận khóa điều khiển IP đã lưu. Kiểm tra trên TV rồi nhập lại:",
      step1: "<b>Cài đặt › Mạng &amp; Internet › Cài đặt thiết bị từ xa › Điều khiển từ xa</b>: Bật.",
      step2: "<b>Cài đặt › Mạng &amp; Internet › Mạng gia đình › Điều khiển IP › Xác thực</b>: Bình thường và Khóa chia sẻ trước.",
      step3: "<b>Khóa chia sẻ trước</b> (cùng menu): khóa bất kỳ, ví dụ 4 chữ số.",
      step4_here: "Nhập đúng khóa đó vào đây.",
      step4_below: "Nhập đúng khóa đó vào ô bên dưới.",
      psk_ph: "Khóa chia sẻ trước", save: "Lưu",
      screen_off: "Tắt màn hình", screen_on: "Bật màn hình", standby: "Chế độ chờ", turn_on: "Bật TV",
      power_hint: "Tắt màn hình chỉ tắt hình, TV vẫn chạy nên luôn bật lại được. Khi ở chế độ chờ, TV có thể không nhận lệnh Bật TV.",
      msg_title: "Tin nhắn lên TV", msg_ph: "Cơm xong rồi!", show_on_tv: "Hiện lên TV",
      a_clear_msg: "Gỡ tin nhắn trên TV",
      msg_hint: "TV về màn hình chính và hiện tin nhắn chữ lớn đến khi có người bấm OK. Nút ✕ để gỡ tin nhắn.",
      tv_is: "Trạng thái TV", locked: "Đã khóa", unlocked: "Đã mở khóa", lock: "Khóa TV", unlock: "Mở khóa",
      no_pin: "Hãy đặt mã PIN 4 số trong Cài đặt trước.",
      lock_timer: "Hẹn giờ khóa", until_locks: "nữa TV sẽ khóa", cancel_timer: "Hủy hẹn giờ",
      minutes_ph: "Số phút", start: "Bắt đầu",
      timer_hint: "TV đếm ngược ở góc màn hình rồi khóa. Mã PIN để mở khóa.",
      screen_time: "Thời gian xem", today: "Hôm nay", days7: "7 ngày", loading: "Đang tải…",
      notifications: "Thông báo", notify_hint: "Khi TV bật hoặc tắt",
      a_notify: "Báo cho tôi khi TV bật hoặc tắt",
      when_off: "Khi TV tắt", when_off_hint: "Tắt: chỉ báo khi TV bật",
      a_notify_off: "Báo cả khi TV tắt",
      add_home: "Thêm vào MH chính", install: "Thêm",
      pin_title: "Mã PIN", pin_hint: "Mở khóa TV; cũng là mã PIN khóa ứng dụng", pin_ph: "4 chữ số",
      psk_title: "Khóa điều khiển IP Sony", psk_hint: "Cho Tắt/Bật màn hình, chế độ chờ và các phím điều khiển",
      adb_default: "Gỡ lỗi không dây", a_adb: "ADB qua mạng",
      agents: "Trợ lý AI", agents_hint: "Trợ lý như Claude dùng TV này bằng khóa riêng",
      agent_name_ph: "Tên, ví dụ Claude", create: "Tạo", key_copy_now: "Sao chép khóa ngay",
      key_once: "Khóa chỉ hiện lần này. Trợ lý gửi khóa qua <b>Authorization: Bearer</b> (hoặc <b>TV_AGENT_KEY</b> cho MCP server).",
      copy_key: "Sao chép khóa", a_hide_key: "Ẩn khóa", agent_log: "Lệnh gần đây của trợ lý",
      language: "Ngôn ngữ", language_hint: "Tự động: theo ngôn ngữ của TV", lang_auto: "Tự động (theo TV)",
      forget_title: "Quên TV này", forget_hint: "Quét lại mã QR để ghép đôi", forget: "Quên",
      tab_remote: "Điều khiển", tab_message: "Tin nhắn", tab_lock: "Khóa", tab_activity: "Hoạt động", tab_settings: "Cài đặt",
      greet_night: "Chúc ngủ ngon", greet_morning: "Chào buổi sáng", greet_afternoon: "Chào buổi chiều", greet_evening: "Chào buổi tối",
      not_paired_again: "Điện thoại này không còn ghép đôi. Hãy quét lại mã QR trên TV.",
      just_now: "vừa xong", min_ago: "{0} phút trước", h_ago: "{0} giờ trước", days_ago: "{0} ngày trước",
      doc_title: "{0} · Điều khiển",
      st_online: "Đã kết nối", st_standby: "Đang chờ", st_offline: "Mất kết nối", st_offline_ago: "Mất kết nối · {0}",
      st_not_paired: "Chưa ghép đôi", st_checking: "Đang kiểm tra…",
      phone_offline_title: "Điện thoại đang mất mạng",
      phone_offline_text: "Kiểm tra Wi-Fi hoặc dữ liệu di động. Điều khiển tự kết nối lại khi có mạng.",
      tv_off_title: "TV đang tắt", tv_offline_title: "TV mất kết nối",
      last_seen_text: "Lần cuối thấy TV: {0}. Các nút điều khiển tự hiện lại khi TV bật.",
      a_while_ago: "khá lâu rồi",
      tv_back: "TV đã kết nối lại.", no_picture: "Không có hình.", no_picture_now: "Chưa nhận được hình từ TV.",
      ok_done: "Xong.", went_wrong: "Có lỗi xảy ra.", no_conn: "Không có kết nối.",
      screen_on_done: "Đã bật màn hình.", screen_off_done: "Đã tắt màn hình.",
      enter_key_first: "Hãy nhập khóa trước.", saved_on_tv: "Đã lưu trên TV.", bad_key: "Khóa không đúng.",
      hold_ok_newer: "Giữ OK cần launcher mới hơn trên TV.", sent: "Đã gửi.",
      min_n: "{0} phút", h_n: "{0} giờ", h_min: "{0} giờ {1} phút", h_m: "{0} giờ {1}",
      report_fail: "Không tải được báo cáo.",
      need_usage: "TV cần quyền truy cập dữ liệu sử dụng cho Thời gian xem (script cài đặt sẽ cấp quyền này).",
      all_apps: "Tất cả ứng dụng", in_7d: "trong 7 ngày qua", today_l: "hôm nay", nothing_yet: "Chưa xem gì.",
      wd_on: "Đang bật gỡ lỗi không dây", wd_on_ip: "Đang bật gỡ lỗi không dây · {0}",
      adb_off_classic: "Tắt · ADB thường ở {0}:5555", wd_off: "Đã tắt gỡ lỗi không dây",
      switching_on: "Đang bật…", switching_off: "Đang tắt…", adb_on: "Đã bật ADB.", adb_off: "Đã tắt ADB.",
      perm_read: "Xem", perm_read_summary: "Trạng thái, thông tin, ứng dụng và thời gian xem của TV",
      perm_control: "Điều khiển", perm_control_summary: "Phím điều khiển, gõ chữ, mở ứng dụng, nguồn, tin nhắn và khóa TV",
      perm_adb: "ADB", perm_adb_summary: "Bật hoặc tắt gỡ lỗi không dây, và địa chỉ của nó",
      perm_adb_warning: "Khi đó, ai trong mạng nhà đã ghép đôi trước đều có thể kết nối.",
      agent_perms_text: "Trợ lý mới chỉ được xem; Điều khiển và ADB là công tắc trên từng trợ lý (cấp quyền cần mã PIN của TV). Hướng dẫn cho trợ lý: {0}",
      perm_for: "{0} cho {1}", ask_pin: "Mã PIN của TV, để cấp quyền {0} cho {1}:",
      granted: "Đã cấp quyền {0}.", taken: "Đã thu hồi quyền {0}.",
      used_ago: "Dùng {0}", not_used: "Chưa dùng", revoke: "Thu hồi",
      revoke_confirm: "Thu hồi {0}? Khóa của trợ lý này ngừng hoạt động ngay.", revoked: "Đã thu hồi.", not_done: "không thực hiện được",
      no_https: "Trình duyệt này không tạo được khóa ở đây (cần https).", agent_default: "Trợ lý",
      agent_created: "Đã tạo trợ lý.", key_for: "Khóa của {0}: sao chép ngay",
      key_copied: "Đã sao chép khóa.", key_selected: "Đã chọn: hãy sao chép từ menu.",
      notify_need_home: "Thêm vào MH chính trước, rồi bật mục này ở đó",
      notify_cant: "Trình duyệt này không hiện được thông báo", notify_blocked: "Đang bị chặn trong cài đặt điện thoại",
      notify_not_allowed: "Chưa cho phép thông báo.", relay_refused: "Relay từ chối.",
      notify_on: "Đã bật thông báo.", notify_fail: "Không bật được thông báo.", notify_off: "Đã tắt thông báo.",
      notify_first: "Hãy bật thông báo trước.", notify_both: "Bạn sẽ được báo khi TV bật hoặc tắt.",
      notify_on_only: "Chỉ báo khi TV bật.", change_fail: "Không đổi được.",
      bad_link: "Đây không phải link ghép đôi của TV.", type_first: "Hãy nhập tin nhắn trước.",
      shown: "Đã hiện lên TV.", cleared: "Đã gỡ.", locked_done: "Đã khóa TV.", unlocked_done: "Đã mở khóa.",
      timer_started: "Đã hẹn giờ khóa.", minutes_range: "Từ 1 đến 720 phút.", timer_cancelled: "Đã hủy hẹn giờ.",
      pin_4: "Mã PIN gồm 4 chữ số.", pin_saved: "Đã lưu mã PIN.",
      install_ios: "Chia sẻ › Thêm vào MH chính để mở như ứng dụng", install_hint: "Mở điều khiển như một ứng dụng",
    },
    zh: {
      unp_title: "尚未配对",
      unp_text: "在电视主屏幕顶部的 Wi-Fi 按钮上长按 OK，然后用这部手机扫描二维码。",
      unp_paste: "或粘贴二维码中的链接（在相机中长按链接并复制）：",
      pair: "配对",
      connecting_title: "正在连接电视…",
      connecting_text: "电视一响应，控制按钮就会出现。",
      live_view: "实时画面",
      a_full: "全屏",
      a_live_toggle: "显示或隐藏实时画面",
      live_starting: "正在开启实时画面…",
      a_exit_full: "退出全屏",
      live_hint: "经中继每秒约两帧，在家庭网络中更流畅。Netflix 等受保护的视频、HDMI 和电视调谐器显示为黑屏。",
      a_up: "上", a_down: "下", a_left: "左", a_right: "右",
      a_ok: "确定，按住为长按",
      a_back: "返回", a_home: "主页", a_menu: "菜单", a_mute: "静音",
      a_vdown: "音量减", a_vup: "音量加", a_kb: "键盘",
      a_chdown: "频道减", a_chup: "频道加", ch_tag: "频道",
      keyboard: "键盘", done_btn: "完成",
      kb_ph: "输入或粘贴，文字会出现在电视上选中的输入框中。",
      enter: "回车", a_clear: "清除",
      kb_hint: "请先在电视上选中一个输入框。输入的内容会实时替换框中的文字。",
      power: "电源",
      ip_setup_new: "这些功能使用电视的 IP 控制，目前尚未设置。在电视上：",
      ip_setup_refused: "电视拒绝了已保存的 IP 控制密钥。请在电视上核对后重新输入：",
      step1: "<b>设置 › 网络和互联网 › 远程设备设置 › 远程控制</b>：开启。",
      step2: "<b>设置 › 网络和互联网 › 家庭网络 › IP 控制 › 认证</b>：常规和预共享密钥。",
      step3: "<b>预共享密钥</b>（同一菜单）：任意密钥，例如 4 位数字。",
      step4_here: "在这里输入同一密钥。",
      step4_below: "在下方输入同一密钥。",
      psk_ph: "预共享密钥", save: "保存",
      screen_off: "关闭屏幕", screen_on: "打开屏幕", standby: "待机", turn_on: "开机",
      power_hint: "关闭屏幕只关掉画面，电视仍在运行，所以随时可以打开屏幕。待机时电视可能收不到开机指令。",
      msg_title: "在电视上显示消息", msg_ph: "开饭啦！", show_on_tv: "在电视上显示",
      a_clear_msg: "清除电视上的消息",
      msg_hint: "电视会回到主页并以大字显示消息，直到有人按 OK。按 ✕ 可撤下消息。",
      tv_is: "电视状态", locked: "已锁定", unlocked: "未锁定", lock: "锁定", unlock: "解锁",
      no_pin: "请先在设置中设定 4 位 PIN。",
      lock_timer: "定时锁定", until_locks: "后电视将锁定", cancel_timer: "取消定时",
      minutes_ph: "分钟数", start: "开始",
      timer_hint: "电视会在角落倒计时，然后锁定。用 PIN 解锁。",
      screen_time: "屏幕使用时间", today: "今天", days7: "7 天", loading: "加载中…",
      notifications: "通知", notify_hint: "电视开机或关机时",
      a_notify: "电视开机或关机时通知我",
      when_off: "关机时", when_off_hint: "关闭：只在电视开机时通知",
      a_notify_off: "电视关机时也通知我",
      add_home: "添加到主屏幕", install: "安装",
      pin_title: "PIN", pin_hint: "用于解锁电视，也是应用锁的 PIN", pin_ph: "4 位数字",
      psk_title: "Sony IP 控制密钥", psk_hint: "用于关闭/打开屏幕、待机和遥控按键",
      adb_default: "无线调试", a_adb: "通过网络使用 ADB",
      agents: "AI 助手", agents_hint: "Claude 等助手用自己的密钥使用这台电视",
      agent_name_ph: "名称，例如 Claude", create: "创建", key_copy_now: "请立即复制密钥",
      key_once: "密钥只显示这一次。助手以 <b>Authorization: Bearer</b> 发送（MCP 服务器则用 <b>TV_AGENT_KEY</b>）。",
      copy_key: "复制密钥", a_hide_key: "隐藏密钥", agent_log: "助手最近的指令",
      language: "语言", language_hint: "自动：跟随电视的语言", lang_auto: "自动（跟随电视）",
      forget_title: "忘记这台电视", forget_hint: "重新扫描二维码即可配对", forget: "忘记",
      tab_remote: "遥控", tab_message: "消息", tab_lock: "锁定", tab_activity: "活动", tab_settings: "设置",
      greet_night: "晚安", greet_morning: "早上好", greet_afternoon: "下午好", greet_evening: "晚上好",
      not_paired_again: "这部手机已不再配对。请重新扫描电视上的二维码。",
      just_now: "刚刚", min_ago: "{0} 分钟前", h_ago: "{0} 小时前", days_ago: "{0} 天前",
      doc_title: "{0} · 遥控器",
      st_online: "在线", st_standby: "待机", st_offline: "离线", st_offline_ago: "离线 · {0}",
      st_not_paired: "未配对", st_checking: "正在检查…",
      phone_offline_title: "这部手机已断网",
      phone_offline_text: "请检查 Wi-Fi 或移动数据。网络恢复后遥控器会自动重新连接。",
      tv_off_title: "电视已关机", tv_offline_title: "电视已离线",
      last_seen_text: "最后在线：{0}。电视开机后控制按钮会自动恢复。",
      a_while_ago: "一段时间前",
      tv_back: "电视已重新连接。", no_picture: "没有画面。", no_picture_now: "暂时收不到电视的画面。",
      ok_done: "完成。", went_wrong: "出错了。", no_conn: "没有网络连接。",
      screen_on_done: "屏幕已打开。", screen_off_done: "屏幕已关闭。",
      enter_key_first: "请先输入密钥。", saved_on_tv: "已保存到电视。", bad_key: "密钥不正确。",
      hold_ok_newer: "长按 OK 需要电视上较新版本的启动器。", sent: "已发送。",
      min_n: "{0} 分钟", h_n: "{0} 小时", h_min: "{0} 小时 {1} 分钟", h_m: "{0} 小时 {1} 分",
      report_fail: "无法加载报告。",
      need_usage: "屏幕使用时间需要电视的使用情况访问权限（安装脚本会授予）。",
      all_apps: "所有应用", in_7d: "过去 7 天", today_l: "今天", nothing_yet: "还没有观看记录。",
      wd_on: "无线调试已开启", wd_on_ip: "无线调试已开启 · {0}",
      adb_off_classic: "关闭 · 经典 ADB 在 {0}:5555", wd_off: "无线调试已关闭",
      switching_on: "正在开启…", switching_off: "正在关闭…", adb_on: "ADB 已开启。", adb_off: "ADB 已关闭。",
      perm_read: "读取", perm_read_summary: "状态、信息、电视的应用和屏幕使用时间",
      perm_control: "控制", perm_control_summary: "遥控按键、输入文字、打开应用、电源、消息和锁定",
      perm_adb: "ADB", perm_adb_summary: "开启或关闭无线调试，以及其地址",
      perm_adb_warning: "家庭网络中任何已配对过的设备随后都能连接。",
      agent_perms_text: "新助手只能读取；控制和 ADB 是每个助手上的开关（授予时需要电视的 PIN）。助手指南：{0}",
      perm_for: "{1} 的{0}权限", ask_pin: "输入电视的 PIN，以授予 {1} {0}权限：",
      granted: "已授予{0}权限。", taken: "已收回{0}权限。",
      used_ago: "上次使用：{0}", not_used: "尚未使用", revoke: "撤销",
      revoke_confirm: "撤销 {0}？其密钥会立即失效。", revoked: "已撤销。", not_done: "未完成",
      no_https: "此浏览器无法在这里生成密钥（需要 https）。", agent_default: "助手",
      agent_created: "助手已创建。", key_for: "{0} 的密钥：请立即复制",
      key_copied: "密钥已复制。", key_selected: "已选中：请从菜单中复制。",
      notify_need_home: "请先添加到主屏幕，再从那里开启",
      notify_cant: "此浏览器无法显示通知", notify_blocked: "已在手机设置中被屏蔽",
      notify_not_allowed: "未允许通知。", relay_refused: "中继拒绝了请求。",
      notify_on: "通知已开启。", notify_fail: "无法开启通知。", notify_off: "通知已关闭。",
      notify_first: "请先开启通知。", notify_both: "电视开机或关机时都会通知你。",
      notify_on_only: "只在电视开机时通知。", change_fail: "无法更改。",
      bad_link: "这不是电视的配对链接。", type_first: "请先输入消息。",
      shown: "已在电视上显示。", cleared: "已清除。", locked_done: "已锁定。", unlocked_done: "已解锁。",
      timer_started: "定时已开始。", minutes_range: "1 到 720 分钟。", timer_cancelled: "定时已取消。",
      pin_4: "PIN 为 4 位数字。", pin_saved: "PIN 已保存。",
      install_ios: "分享 › 添加到主屏幕，即可像应用一样打开", install_hint: "像应用一样打开遥控器",
    },
  };
  // A BCP-47 tag (the TV's Locale.toLanguageTag(), the phone's navigator.languages) to a language of the page.
  function langOf(tag) {
    const s = String(tag || "").toLowerCase();
    if (/^vi([-_]|$)/.test(s)) return "vi";
    if (/^zh([-_]|$)/.test(s)) return "zh";
    if (/^en([-_]|$)/.test(s)) return "en";
    return "";
  }
  // First match wins: the choice made in Settings, the TV's language, the phone's languages, English.
  function pickLang(saved, tvLang, phoneLangs) {
    if (saved && T[saved]) return saved;
    const fromTv = langOf(tvLang);
    if (fromTv) return fromTv;
    for (const l of phoneLangs || []) { const p = langOf(l); if (p) return p; }
    return "en";
  }
  // ---- i18n (end) ----------------------------------------------------------------------------------
  const LANG = "tvremote-lang", TV_LANG = "tvremote-tvlang";
  let savedLang = "", tvLang = "";
  try { savedLang = localStorage.getItem(LANG) || ""; tvLang = localStorage.getItem(TV_LANG) || ""; } catch (e) {}
  const phoneLangs = () => navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  let lang = pickLang(savedLang, tvLang, phoneLangs());
  function t(key, ...args) {
    const s = (T[lang] && T[lang][key]) || T.en[key] || key;
    return s.replace(/[{]([0-9])[}]/g, (m, i) => String(args[+i]));
  }
  // Text that changes with the state keeps its key on the element, so a language switch redraws it too.
  function setT(e, key, ...args) {
    e.dataset.i18n = key;
    if (args.length) e.dataset.i18nArgs = JSON.stringify(args); else delete e.dataset.i18nArgs;
    e.textContent = t(key, ...args);
  }
  function setRaw(e, text) { delete e.dataset.i18n; delete e.dataset.i18nArgs; e.textContent = text; }
  function applyI18n() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.querySelectorAll("[data-i18n]").forEach((e) => {
      let a = [];
      try { a = JSON.parse(e.dataset.i18nArgs || "[]"); } catch (err) {}
      e.textContent = t(e.dataset.i18n, ...a);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((e) => (e.innerHTML = t(e.dataset.i18nHtml)));
    ["placeholder", "title", "aria-label"].forEach((attr) => document.querySelectorAll("[data-i18n-" + attr + "]")
      .forEach((e) => e.setAttribute(attr, t(e.getAttribute("data-i18n-" + attr)))));
    document.querySelectorAll("#langPick button").forEach((b) => b.classList.toggle("white", b.dataset.lang === savedLang));
  }
  applyI18n();

  // ---- icons (stroke icons, 24 px grid) ------------------------------------------------------------
  const SPK = '<path d="M11 5 6 9H3v6h3l5 4z"/>';
  const ICONS = {
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    home: '<path d="M4 11.5 12 4l8 7.5V20h-5v-5h-6v5H4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    mute: SPK + '<path d="m16 9 5 6M21 9l-5 6"/>',
    vdown: SPK + '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    vup: SPK + '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
    plus: '<path d="M12 6v12M6 12h12"/>', minus: '<path d="M6 12h12"/>',
    kb: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    enter: '<path d="M20 5v6a3 3 0 0 1-3 3H5"/><path d="m9 10-4 4 4 4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    eyeoff: '<path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2M3 3l18 18"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    screenoff: '<path d="M7 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-1 1.7M17 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 .6-1.4"/><path d="M8 20h8M12 16v4M3 3l18 18"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 7.2a8 8 0 1 0 11.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    dpad: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m12 4.5-1.2 1.4h2.4zM12 19.5l-1.2-1.4h2.4zM4.5 12l1.4-1.2v2.4zM19.5 12l-1.4-1.2v2.4z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M16 7l3 3M18.5 4.5l2 2"/>',
    plug: '<path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0zM12 17v5"/>',
    add: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
    unlink: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 4 8M8 12h3M3 3l18 18"/>',
    tv: '<rect x="2" y="5" width="20" height="13" rx="2.5"/><path d="M8 21h8M8 2l4 3 4-3"/>',
    terminal: '<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    tvoff: '<rect x="2" y="5" width="20" height="13" rx="2.5"/><path d="M8 21h8M9 9l6 5M15 9l-6 5"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  };
  function icon(e) {
    const d = ICONS[e.dataset.i];
    if (!d) return;
    const big = e.classList.contains("big");
    e.innerHTML = '<svg viewBox="0 0 24 24" width="' + (big ? "100%" : "24") + '" height="' + (big ? "100%" : "24") + '" fill="none" stroke="currentColor" stroke-width="' + (big ? 1.4 : 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  document.querySelectorAll("[data-i]").forEach(icon);
  function setIcon(e, name) { e.dataset.i = name; icon(e); }

  // ---- pairing -----------------------------------------------------------------------------------
  const STORE = "tvremote";
  let tv = null;
  try { tv = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
  function parsePairing(s) {
    const m = /([A-Za-z0-9_-]{12,32})[.]([A-Za-z0-9_-]{22,64})$/.exec(s || "");
    return m ? { id: m[1], key: m[2] } : null;
  }
  const given = parsePairing(location.hash.slice(1)) || parsePairing(new URLSearchParams(location.search).get("p"));
  if (given) {
    tv = given;
    try { localStorage.setItem(STORE, JSON.stringify(tv)); } catch (e) {}
  }
  // A paired page lives at /?p=<id>.<key>: the server then links the manifest whose start_url is that
  // address, so Add to Home Screen makes an app that opens paired (iOS gives it storage of its own).
  if (tv && location.search !== "?p=" + tv.id + "." + tv.key) {
    location.replace("/?p=" + tv.id + "." + tv.key);
    return;
  }
  let swReg = null;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").then((r) => (swReg = r)).catch(() => {});

  // The TV's own greeting: "Good afternoon, Mr Trịnh 👋", the name from its settings (kept for the next start).
  let greetName = "";
  try { greetName = localStorage.getItem("tvremote-greet") || ""; } catch (e) {}
  function drawGreeting() {
    const h = new Date().getHours();
    const g = t(h < 5 ? "greet_night" : h < 12 ? "greet_morning" : h < 17 ? "greet_afternoon" : h < 22 ? "greet_evening" : "greet_night");
    $("greeting").textContent = (greetName ? g + ", " + greetName : g) + " 👋";
  }
  drawGreeting();
  setInterval(drawGreeting, 60000);

  let toastTimer;
  function toast(msg, bad) {
    const box = $("toast");
    box.textContent = msg;
    box.className = "show" + (bad ? " bad" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (box.className = ""), 2600);
  }

  async function post(path, extra) {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ id: tv.id, key: tv.key }, extra)) });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (r.status === 403) j.msg = t("not_paired_again");
    return j;
  }

  // ---- status ---------------------------------------------------------------------------------
  let online = null, lockAt = 0, lastSeen = 0, tvHasPin = false, lastPower = null, tvName = "";
  function ago(when) {
    if (!when) return "";
    const s = Math.max(0, Math.round((Date.now() - when) / 1000));
    if (s < 90) return t("just_now");
    if (s < 5400) return t("min_ago", Math.round(s / 60));
    if (s < 129600) return t("h_ago", Math.round(s / 3600));
    return t("days_ago", Math.round(s / 86400));
  }
  function applyStatus(st) {
    // The TV's language (an older launcher sends none): the page follows it unless a language was chosen here.
    if (typeof st.lang === "string" && st.lang && st.lang !== tvLang) {
      tvLang = st.lang;
      try { localStorage.setItem(TV_LANG, tvLang); } catch (e) {}
      relang();
    }
    if (st.name) { tvName = st.name; $("title").textContent = st.name; document.title = t("doc_title", st.name); }
    if (st.lastSeen) lastSeen = st.lastSeen;
    setLock(st.state);
    setOnline(!!st.online, st.power);
  }
  function setOnline(on, power) {
    const was = online;
    online = on;
    lastPower = power;
    // On: no Turn on. Standby (screen off, still connected): no Standby, a green Turn on instead.
    const standby = on && power === "off";
    $("btnStandby").hidden = standby;
    $("btnWake").hidden = !standby;
    $("status").className = "status " + (on ? (power === "off" ? "standby" : "on") : "off");
    drawStatus();
    document.body.classList.toggle("tv-off", !on);
    $("offlineCard").hidden = on || tab === "settings";
    if (on && was === false) { toast(t("tv_back")); loadReport(); loadInfo(); }
    if (on !== was) setLive(tab === "remote");
    if (on && was === null) { loadReport(); loadInfo(); }
  }
  function drawStatus() {
    const on = online, power = lastPower;
    if (on) setT($("statusText"), power === "off" ? "st_standby" : "st_online");
    else if (lastSeen) setT($("statusText"), "st_offline_ago", ago(lastSeen));
    else setT($("statusText"), "st_offline");
    if (!on && !navigator.onLine) {
      setT($("offlineTitle"), "phone_offline_title");
      setT($("offlineText"), "phone_offline_text");
    } else if (!on) {
      setT($("offlineTitle"), power === "off" ? "tv_off_title" : "tv_offline_title");
      setT($("offlineText"), "last_seen_text", ago(lastSeen) || t("a_while_ago"));
    }
  }
  function setLock(st) {
    if (!st) return;
    setT($("lockBadge"), st.locked ? "locked" : "unlocked");
    $("lockFace").classList.toggle("locked", !!st.locked);
    setIcon($("lockIcon"), st.locked ? "lock" : "unlock");
    $("noPin").hidden = !!st.hasPin;
    tvHasPin = !!st.hasPin;
    lockAt = st.lockAt || 0;
    drawTimer();
  }
  function drawTimer() {
    const left = lockAt ? Math.ceil((lockAt - Date.now()) / 1000) : 0;
    $("timerRun").hidden = left <= 0;
    $("timerSet").hidden = left > 0;
    if (left > 0) {
      const hh = Math.floor(left / 3600), mm = Math.floor(left / 60) % 60, s = left % 60;
      $("countdown").textContent = (hh ? hh + ":" + String(mm).padStart(2, "0") : mm) + ":" + String(s).padStart(2, "0");
    }
  }
  setInterval(drawTimer, 1000);
  // Offline: keep "· 5 min ago" current. A tap on the pill checks again now.
  setInterval(() => { if (online === false) drawStatus(); }, 30000);

  // Live status over a WebSocket; the key goes in the first message, not in the address.
  let sock = null, backoff = 1000, pinger = null;
  function connect() {
    if (sock && sock.readyState <= 1) return;
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/phone?id=" + tv.id);
    sock = ws;
    ws.onopen = () => {
      backoff = 1000;
      ws.send(JSON.stringify({ t: "auth", key: tv.key }));
      if (liveOn) ws.send(JSON.stringify({ t: "live", on: true, fps: LIVE_FPS }));
      clearInterval(pinger);
      pinger = setInterval(() => { try { ws.send("ping"); } catch (e) {} }, 30000);
    };
    ws.binaryType = "blob";
    ws.onmessage = (e) => {
      if (typeof e.data !== "string") { showFrame(e.data); return; }
      if (e.data === "pong") return;
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.t === "status") applyStatus(msg);
      if (msg.t === "live_error") { if (msg.msg) setRaw($("liveMsg"), msg.msg); else setT($("liveMsg"), "no_picture"); }
      if (msg.t === "unpaired") toast(t("not_paired_again"), true);
    };
    ws.onclose = () => {
      clearInterval(pinger);
      if (sock !== ws) return;
      sock = null;
      if (!document.hidden) setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 30000);
    };
  }
  async function refresh() {
    try { const j = await post("/api/status", {}); if (j.ok) applyStatus(j); } catch (e) {}
  }

  async function run(cmd, opts, okMsg, btn) {
    if (btn) btn.disabled = true;
    try {
      const j = await post("/api/cmd", Object.assign({ cmd: cmd }, opts || {}));
      setLock(j.state);
      if (j.ok) { if (okMsg !== null) toast(j.msg || okMsg || t("ok_done")); }
      else { toast(j.msg || j.error || t("went_wrong"), true); if (j.offline) setOnline(false); }
      return j;
    } catch (e) {
      toast(t("no_conn"), true);
      return {};
    } finally { if (btn) btn.disabled = false; }
  }

  // What the TV has: IP control set up, and the commands it knows (an older launcher knows fewer).
  let caps = null;
  async function loadInfo() {
    const j = await run("info", {}, null);
    if (!j.ok || !j.data) return;
    caps = j.data.caps || null;
    if (tab === "settings") loadAgents();
    $("ipSetup").hidden = !!j.data.ipControl;
    if (j.data.ipControl) loadPicture();
    setT($("ipSetupText"), j.data.ipKeySaved ? "ip_setup_refused" : "ip_setup_new");
    const st = await run("local", { args: { method: "GET", path: "/api/state" } }, null);
    if (st.ok && st.data && typeof st.data.greeting === "string") {
      greetName = st.data.greeting.trim();
      try { localStorage.setItem("tvremote-greet", greetName); } catch (e) {}
      drawGreeting();
    }
  }
  // Screen off/on: one button that blanks the picture or brings it back; the TV says which it is now.
  let pictureOff = false;
  function drawPicture() {
    setIcon($("pictureIcon"), pictureOff ? "screen" : "screenoff");
    setT($("pictureLabel"), pictureOff ? "screen_on" : "screen_off");
    $("btnPicture").classList.toggle("green", pictureOff);
  }
  async function loadPicture() {
    const j = await run("sony", { args: { service: "system", method: "getPowerSavingMode", params: [], version: "1.0" } }, null);
    if (j.ok && Array.isArray(j.data) && j.data[0]) { pictureOff = j.data[0].mode === "pictureOff"; drawPicture(); }
  }
  $("btnPicture").onclick = async (e) => {
    const j = await run(pictureOff ? "screen_on" : "screen_off", {}, t(pictureOff ? "screen_on_done" : "screen_off_done"), e.currentTarget);
    if (j.ok) { pictureOff = !pictureOff; drawPicture(); }
  };

  async function savePsk(input, btn) {
    if (!input.value.trim()) { toast(t("enter_key_first"), true); return; }
    btn.disabled = true;
    const j = await post("/api/cmd", { cmd: "set_psk", text: input.value }).catch(() => ({ msg: t("no_conn") }));
    btn.disabled = false;
    // The TV says "refused the IP control key" for a wrong key: say it plainly.
    if (j.ok) toast(j.msg || t("saved_on_tv"));
    else toast(/refuse/i.test(j.msg || "") ? t("bad_key") : j.msg || j.error || t("went_wrong"), true);
    if (j.ok) { input.value = ""; $("ipSetup").hidden = true; }
    else loadInfo();
  }

  // ---- tabs ---------------------------------------------------------------------------------------
  let tab = "remote";
  function showTab(name) {
    tab = name;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("sel", b.dataset.tab === name));
    document.querySelectorAll(".tab").forEach((p) => (p.hidden = p.id !== "tab-" + name));
    $("offlineCard").hidden = online === true || name === "settings";
    setLive(name === "remote");
    if (name === "activity") loadReport();
    if (name === "settings") { loadAdb(); loadAgents(); }
    window.scrollTo(0, 0);
    try { sessionStorage.setItem("tvremote-tab", name); } catch (e) {}
  }
  document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

  // A language switch (chosen here, or the TV's changed): every marked text, then what is drawn from state.
  function relang() {
    lang = pickLang(savedLang, tvLang, phoneLangs());
    applyI18n();
    drawGreeting();
    if (tvName) document.title = t("doc_title", tvName);
    if (online !== null) drawStatus();
    if (report) drawReport();
    if (lastAgents) drawAgents(lastAgents);
  }

  // ---- live view and remote keys -------------------------------------------------------------------
  // Over the relay about 2 pictures a second; straight from the TV on the home network (the TV serves this page
  // over http there) up to 30, the TV dropping frames it can't keep up with.
  const LIVE_FPS = location.protocol === "http:" ? 30 : 2;
  let liveOn = false, frameUrl = null, lastFrameAt = 0;
  let liveShown = true;
  try { liveShown = localStorage.getItem("tvremote-live") !== "hidden"; } catch (e) {}
  function drawLiveToggle() {
    $("liveBox").hidden = !liveShown;
    setIcon($("liveToggle").firstElementChild, liveShown ? "eye" : "eyeoff");
  }
  drawLiveToggle();
  $("liveToggle").onclick = () => {
    liveShown = !liveShown;
    drawLiveToggle();
    try { localStorage.setItem("tvremote-live", liveShown ? "shown" : "hidden"); } catch (e) {}
    setLive(tab === "remote");
  };
  // Full screen: the Fullscreen API (Android, desktop), else a fixed overlay (iPhone has the API only for video).
  let fullHome = null;
  function setFull(on) {
    const el = $("liveScreen");
    if (on === el.classList.contains("full")) return;
    // Out to <body> while full: the card's backdrop-filter would make position:fixed relative to the card.
    if (on) { fullHome = document.createComment("live"); el.replaceWith(fullHome); document.body.appendChild(el); }
    else if (fullHome) { fullHome.replaceWith(el); fullHome = null; }
    el.classList.toggle("full", on);
    document.body.style.overflow = on ? "hidden" : "";
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (on && req) { try { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
    if (!on && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
    }
    if (on && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
  }
  $("liveFull").onclick = () => { if (!liveShown) { $("liveToggle").click(); } setFull(true); };
  $("liveExit").onclick = () => setFull(false);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) setFull(false); });
  document.addEventListener("webkitfullscreenchange", () => { if (!document.webkitFullscreenElement) setFull(false); });

  function setLive(on) {
    on = on && liveShown && !document.hidden && online !== false;
    if (on === liveOn) return;
    liveOn = on;
    if (on) { setT($("liveMsg"), "live_starting"); $("liveMsg").hidden = false; lastFrameAt = 0; }
    if (sock && sock.readyState === 1) sock.send(JSON.stringify({ t: "live", on: on, fps: LIVE_FPS }));
  }
  function showFrame(blob) {
    if (!liveOn) return;
    const url = URL.createObjectURL(blob);
    const img = $("liveImg");
    img.onload = () => { if (frameUrl) URL.revokeObjectURL(frameUrl); frameUrl = url; };
    img.src = url;
    lastFrameAt = Date.now();
    $("liveMsg").hidden = true;
  }
  setInterval(() => {
    if (liveOn && lastFrameAt && Date.now() - lastFrameAt > 8000) { $("liveMsg").hidden = false; setT($("liveMsg"), "no_picture_now"); }
  }, 2000);

  // One press at a time (a press waits for the last one); holding repeats where it makes sense.
  let pressing = Promise.resolve();
  function press(name) {
    if (navigator.vibrate) navigator.vibrate(8);
    pressing = pressing.then(() => run("button", { args: { name: name } }, null)).catch(() => {});
    return pressing;
  }
  document.querySelectorAll("[data-key]").forEach((b) => {
    let timer = null;
    const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(b.dataset.key);
      if (b.hasAttribute("data-repeat")) timer = setTimeout(() => (timer = setInterval(() => press(b.dataset.key), 220)), 450);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // OK: a tap presses OK; held for 0.6 s it is the remote's long press (IRCC has no key hold, so the TV's
  // accessibility service long-clicks whatever has the focus).
  (() => {
    const b = $("okBtn");
    let timer = null, held = false;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      held = false;
      timer = setTimeout(() => {
        timer = null;
        held = true;
        if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
        if (caps && caps.indexOf("longpress") < 0) { toast(t("hold_ok_newer"), true); return; }
        pressing = pressing.then(() => run("longpress", {}, null)).catch(() => {});
      }, 600);
    });
    const end = (tap) => {
      if (timer) { clearTimeout(timer); timer = null; if (tap && !held) press("Confirm"); }
    };
    b.addEventListener("pointerup", () => end(true));
    b.addEventListener("pointerleave", () => end(false));
    b.addEventListener("pointercancel", () => end(false));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  })();

  // Keyboard: the whole text goes to the TV's focused field as it is typed (a pause of 350 ms).
  let typeTimer = null, typing = Promise.resolve();
  function sendText(enter) {
    const text = $("kbText").value;
    typing = typing.then(() => run("type", { args: { text: text, enter: !!enter } }, enter ? t("sent") : null)).catch(() => {});
  }
  $("kbOpen").onclick = () => { $("kb").hidden = false; $("kbText").focus(); $("kb").scrollIntoView({ block: "start", behavior: "smooth" }); };
  $("kbClose").onclick = () => { $("kb").hidden = true; $("kbText").blur(); };
  $("kbText").addEventListener("input", () => { clearTimeout(typeTimer); typeTimer = setTimeout(() => sendText(false), 350); });
  $("kbEnter").onclick = () => { clearTimeout(typeTimer); sendText(true); };
  $("kbClear").onclick = () => { $("kbText").value = ""; clearTimeout(typeTimer); sendText(false); $("kbText").focus(); };

  // ---- screen time ------------------------------------------------------------------------------
  let range = "today";
  function hm(ms) {
    const min = Math.round(ms / 60000);
    if (min < 60) return t("min_n", min);
    return min % 60 ? t("h_min", Math.floor(min / 60), min % 60) : t("h_n", Math.floor(min / 60));
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  // The report: the total and its chart, or one app's when its row is tapped (as on the TV).
  let report = null, picked = null;
  async function loadReport() {
    if (!online || tab !== "activity") return;
    const j = await run("local", { args: { method: "GET", path: "/api/report" + (range === "7d" ? "?range=7d" : "") } }, null);
    const box = $("stBody");
    if (!j.ok) { box.textContent = ""; box.appendChild(el("p", "hint", j.msg || t("report_fail"))); return; }
    report = j.data || {};
    if (picked && !(report.apps || []).some((a) => a.name === picked)) picked = null;
    drawReport();
  }
  function drawReport() {
    const box = $("stBody");
    box.textContent = "";
    const r = report || {};
    if (!r.allowed) { box.appendChild(el("p", "hint", t("need_usage"))); return; }
    const apps = r.apps || [];
    const app = picked ? apps.find((a) => a.name === picked) : null;
    const total = app ? app.ms : r.total || 0;
    const buckets = app ? app.buckets || [] : r.buckets || [];
    const labels = r.labels || [];

    const head = el("div", "st-head");
    const left = el("div");
    left.appendChild(el("div", "eyebrow", app ? app.name : t("all_apps")));
    left.appendChild(el("div", "total", hm(total)));
    head.appendChild(left);
    if (app) {
      const back = el("button", "pill sm", t("all_apps"));
      back.onclick = () => { picked = null; drawReport(); };
      head.appendChild(back);
    }
    box.appendChild(head);
    box.appendChild(el("p", "hint", t(range === "7d" ? "in_7d" : "today_l"))).style.marginTop = "6px";

    const max = Math.max(1, ...buckets);
    const chart = el("div", "chart");
    const tip = el("div", "tip");
    tip.hidden = true;
    buckets.forEach((v, i) => {
      const b = el("div", "b");
      const bar = el("i");
      bar.style.height = Math.round((v / max) * 100) + "%";
      b.appendChild(bar);
      b.title = (labels[i] || "") + ": " + hm(v);
      b.onclick = () => {
        chart.querySelectorAll(".b").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
        tip.textContent = (labels[i] || "") + " · " + hm(v);
        tip.style.left = ((i + 0.5) / buckets.length * 100) + "%";
        tip.hidden = false;
      };
      chart.appendChild(b);
    });
    chart.appendChild(tip);
    box.appendChild(chart);
    if (labels.length) {
      const axis = el("div", "axis");
      [0, Math.floor((labels.length - 1) / 2), labels.length - 1].forEach((k) => axis.appendChild(el("span", "", labels[k])));
      box.appendChild(axis);
    }
    if (apps.length) {
      const list = el("div", "apps");
      const top = Math.max(1, apps[0].ms);
      apps.forEach((a) => {
        const row = el("button", "app" + (a.name === picked ? " sel" : ""));
        const top2 = el("div", "top");
        top2.appendChild(el("span", "", a.name));
        top2.appendChild(el("span", "", hm(a.ms)));
        const bar = el("div", "bar");
        const fill = el("i");
        fill.style.width = Math.max(2, Math.round((a.ms / top) * 100)) + "%";
        bar.appendChild(fill);
        row.appendChild(top2);
        row.appendChild(bar);
        row.onclick = () => { picked = a.name === picked ? null : a.name; drawReport(); };
        list.appendChild(row);
      });
      box.appendChild(list);
    } else if (!r.total) {
      box.appendChild(el("p", "hint", t("nothing_yet")));
    }
  }
  document.querySelectorAll("#range button").forEach((b) => (b.onclick = () => {
    range = b.dataset.r;
    document.querySelectorAll("#range button").forEach((x) => x.classList.toggle("sel", x === b));
    loadReport();
  }));

  // ---- ADB (Wireless debugging) ----------------------------------------------------------------------
  function drawAdb(d) {
    $("adbSwitch").checked = !!d.wifi;
    const h = $("adbHint");
    if (d.wifi && d.ip && d.port) setRaw(h, "adb connect " + d.ip + ":" + d.port);
    else if (d.wifi) { if (d.ip) setT(h, "wd_on_ip", d.ip); else setT(h, "wd_on"); }
    else if (d.tcp5555 && d.ip) setT(h, "adb_off_classic", d.ip);
    else setT(h, "wd_off");
  }
  async function loadAdb() {
    if (!online) return;
    if (caps && caps.indexOf("adb") < 0) { $("adbCard").hidden = true; return; }
    const j = await run("adb", { args: { action: "status" } }, null);
    $("adbCard").hidden = !j.ok;
    if (j.ok && j.data) drawAdb(j.data);
  }
  $("adbSwitch").onchange = async (e) => {
    const box = e.currentTarget;
    box.disabled = true;
    setT($("adbHint"), box.checked ? "switching_on" : "switching_off");
    const j = await run("adb", { args: { action: box.checked ? "on" : "off" } }, t(box.checked ? "adb_on" : "adb_off"));
    box.disabled = false;
    if (j.ok && j.data) drawAdb(j.data); else loadAdb();
  };

  // ---- AI agents ---------------------------------------------------------------------------------
  // The TV keeps the agents and enforces what each may do; this page makes a key, hands the TV only its SHA-256
  // (the key never passes the relay here) and shows it once. The relay fills in the permission summaries.
  const AGENT_PERMS = /*AGENT_PERMS*/null || {
    read: { title: "Read", summary: "Status, info, the TV's apps and screen time" },
    control: { title: "Control", summary: "Remote keys, typing, opening apps, power, messages and the lock" },
    adb: { title: "ADB", summary: "Wireless debugging on or off, and its address", warning: "Anyone on the home network who is already paired can then connect." },
  };
  // The relay's summaries are in English; another language has its own words for the permissions it knows.
  function permText(p, field) {
    const own = lang !== "en" && T[lang]["perm_" + p + (field === "title" ? "" : "_" + field)];
    return own || (AGENT_PERMS[p] && AGENT_PERMS[p][field]) || "";
  }
  setT($("agentPerms"), "agent_perms_text", location.origin + "/api/guide");
  function agentKey() {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    return btoa(String.fromCharCode.apply(null, b)).replace(/[+]/g, "-").replace(/[/]/g, "_").replace(/=+$/, "");
  }
  async function sha256hex(s) {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  async function loadAgents() {
    if (!online || !caps) return;
    if (caps.indexOf("agents") < 0) { $("agentsCard").hidden = true; return; }
    const j = await run("agents", { args: { action: "list" } }, null);
    $("agentsCard").hidden = !j.ok;
    if (j.ok && j.data) drawAgents(j.data);
  }
  function permSwitch(a, perm) {
    const row = el("label", "perm");
    const title = permText(perm, "title");
    const txt = el("span", "txt", title);
    txt.appendChild(el("small", "", permText(perm, "summary")));
    if (AGENT_PERMS[perm].warning) txt.appendChild(el("small", "warn", permText(perm, "warning")));
    const box = el("input", "switch");
    box.type = "checkbox";
    box.checked = !!a[perm];
    box.setAttribute("aria-label", t("perm_for", title, a.name));
    box.onchange = async () => {
      box.disabled = true;
      const args = { action: "set", id: a.id };
      args[perm] = box.checked;
      // Granting control or ADB takes the TV's PIN, as on the TV; the TV checks it.
      const askPin = () => prompt(t("ask_pin", title, a.name));
      if (box.checked && perm !== "read" && tvHasPin) {
        const pin = askPin();
        if (pin === null) { box.checked = false; box.disabled = false; return; }
        args.pin = pin.trim();
      }
      const done = t(box.checked ? "granted" : "taken", title);
      let j = await run("agents", { args: args }, done);
      if (!j.ok && j.data && j.data.pin && !("pin" in args)) {
        const pin = askPin();
        if (pin !== null) { args.pin = pin.trim(); j = await run("agents", { args: args }, done); }
      }
      box.disabled = false;
      if (!j.ok) box.checked = !box.checked;
    };
    row.appendChild(txt);
    row.appendChild(box);
    return row;
  }
  let lastAgents = null;
  function drawAgents(d) {
    lastAgents = d;
    const list = $("agentList");
    list.textContent = "";
    (d.agents || []).forEach((a) => {
      const head = el("div", "setting");
      const ic = el("span", "ic");
      const i = el("i");
      setIcon(i, "bot");
      ic.appendChild(i);
      head.appendChild(ic);
      const txt = el("div", "txt");
      txt.appendChild(el("b", "", a.name));
      txt.appendChild(el("span", "", a.lastUsed ? t("used_ago", ago(a.lastUsed)) : t("not_used")));
      head.appendChild(txt);
      const revoke = el("button", "pill sm red", t("revoke"));
      revoke.onclick = async () => {
        if (!confirm(t("revoke_confirm", a.name))) return;
        if ((await run("agents", { args: { action: "revoke", id: a.id } }, t("revoked"), revoke)).ok) loadAgents();
      };
      head.appendChild(revoke);
      list.appendChild(head);
      const sub = el("div", "sub");
      sub.appendChild(permSwitch(a, "read"));
      sub.appendChild(permSwitch(a, "control"));
      sub.appendChild(permSwitch(a, "adb"));
      list.appendChild(sub);
    });
    const log = (d.log || []).slice(0, 8);
    $("agentLogBox").hidden = !log.length;
    const ul = $("agentLog");
    ul.textContent = "";
    log.forEach((e) => {
      const li = el("li");
      const at = new Date(e.t || 0);
      li.appendChild(el("span", "when", String(at.getHours()).padStart(2, "0") + ":" + String(at.getMinutes()).padStart(2, "0")));
      const what = el("span", "what" + (e.ok ? "" : " bad"), (e.name || "") + " · " + e.cmd + (e.what ? " " + e.what : "") + (e.ok ? "" : " · " + (e.msg || t("not_done"))));
      what.title = what.textContent;
      li.appendChild(what);
      ul.appendChild(li);
    });
  }
  $("agentCreate").onclick = async (e) => {
    if (!window.crypto || !crypto.subtle) { toast(t("no_https"), true); return; }
    const key = agentKey();
    const name = $("agentName").value.trim() || t("agent_default");
    const j = await run("agents", { args: { action: "create", name: name, hash: await sha256hex(key), control: false } }, t("agent_created"), e.currentTarget);
    if (!j.ok) return;
    $("agentName").value = "";
    setT($("agentKeyTitle"), "key_for", (j.data && j.data.name) || name);
    $("agentKey").textContent = "agent:" + tv.id + "." + key;
    $("agentKeyBox").hidden = false;
    loadAgents();
  };
  $("agentCopy").onclick = async () => {
    const text = $("agentKey").textContent;
    try { await navigator.clipboard.writeText(text); toast(t("key_copied")); }
    catch (err) {
      const r = document.createRange();
      r.selectNodeContents($("agentKey"));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      toast(t("key_selected"));
    }
  };
  // Hidden for good: the page keeps the key nowhere.
  $("agentKeyHide").onclick = () => { $("agentKey").textContent = ""; $("agentKeyBox").hidden = true; };

  // ---- notifications ---------------------------------------------------------------------------
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const NOTIFY = "tvremote-notify";
  const NOTIFY_OFF = "tvremote-notify-off";
  function notifyOff() {
    try { return localStorage.getItem(NOTIFY_OFF) !== "0"; } catch (e) { return true; }
  }
  function showNotifyOff(on) {
    $("notifyOffRow").hidden = !on;
    $("notifyOff").checked = notifyOff();
  }
  function canPush() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  function b64ToBytes(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }
  async function setupNotify() {
    if (!canPush()) {
      $("notify").disabled = true;
      setT($("notifyHint"), ios && !standalone ? "notify_need_home" : "notify_cant");
      return;
    }
    let on = false;
    try { on = localStorage.getItem(NOTIFY) === "1" && Notification.permission === "granted"; } catch (e) {}
    $("notify").checked = on;
    showNotifyOff(on);
    if (Notification.permission === "denied") setT($("notifyHint"), "notify_blocked");
  }
  $("notify").onchange = async (e) => {
    const box = e.currentTarget;
    const reg = swReg || (await navigator.serviceWorker.ready);
    if (box.checked) {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") throw new Error(t("notify_not_allowed"));
        const v = await (await fetch("/api/vapid")).json();
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(v.key) });
        const j = await post("/api/push", { sub: sub.toJSON(), test: true, off: notifyOff() });
        if (!j.ok) throw new Error(j.msg || j.error || t("relay_refused"));
        try { localStorage.setItem(NOTIFY, "1"); } catch (err) {}
        showNotifyOff(true);
        toast(t("notify_on"));
      } catch (err) {
        box.checked = false;
        toast(err.message || t("notify_fail"), true);
      }
    } else {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) { await post("/api/push", { unsubscribe: sub.endpoint }); await sub.unsubscribe(); }
      } catch (err) {}
      try { localStorage.removeItem(NOTIFY); } catch (err) {}
      showNotifyOff(false);
      toast(t("notify_off"));
    }
  };
  $("notifyOff").onchange = async (e) => {
    const box = e.currentTarget;
    try {
      const reg = swReg || (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (!sub) throw new Error(t("notify_first"));
      const j = await post("/api/push", { endpoint: sub.endpoint, off: box.checked });
      if (!j.ok) throw new Error(j.msg || j.error || t("relay_refused"));
      try { localStorage.setItem(NOTIFY_OFF, box.checked ? "1" : "0"); } catch (err) {}
      toast(t(box.checked ? "notify_both" : "notify_on_only"));
    } catch (err) {
      box.checked = !box.checked;
      toast(err.message || t("change_fail"), true);
    }
  };

  // ---- start ------------------------------------------------------------------------------------
  $("pairBtn").onclick = () => {
    const p = parsePairing($("pairLink").value.trim());
    if (!p) { toast(t("bad_link"), true); return; }
    try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) {}
    location.replace("/?p=" + p.id + "." + p.key);
  };
  if (!tv) { $("unpaired").hidden = false; $("status").className = "status off"; setT($("statusText"), "st_not_paired"); return; }
  $("paired").hidden = false;
  $("tabs").hidden = false;
  // Language: Auto (the TV's, else the phone's) or one chosen here, kept on this phone.
  document.querySelectorAll("#langPick button").forEach((b) => (b.onclick = () => {
    savedLang = b.dataset.lang || "";
    try { if (savedLang) localStorage.setItem(LANG, savedLang); else localStorage.removeItem(LANG); } catch (e) {}
    relang();
  }));

  $("text").addEventListener("input", () => ($("count").textContent = $("text").value.length));
  $("send").onclick = async (e) => {
    const text = $("text").value.trim();
    if (!text) { toast(t("type_first"), true); return; }
    if ((await run("banner", { text: text }, t("shown"), e.currentTarget)).ok) { $("text").value = ""; $("count").textContent = 0; }
  };
  $("clear").onclick = (e) => run("banner_clear", {}, t("cleared"), e.currentTarget);
  document.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => run(b.dataset.cmd, {}, t("ok_done"), b)));
  $("lockNow").onclick = (e) => run("lock", {}, t("locked_done"), e.currentTarget);
  $("unlockNow").onclick = (e) => run("unlock", {}, t("unlocked_done"), e.currentTarget);
  document.querySelectorAll("#chips [data-min]").forEach((b) => (b.onclick = () => run("lock_timer", { text: b.dataset.min }, t("timer_started"), b)));
  $("timerStart").onclick = async (e) => {
    const mins = parseInt($("minutes").value, 10);
    if (!(mins >= 1 && mins <= 720)) { toast(t("minutes_range"), true); return; }
    if ((await run("lock_timer", { text: String(mins) }, t("timer_started"), e.currentTarget)).ok) $("minutes").value = "";
  };
  $("timerCancel").onclick = (e) => run("lock_timer_cancel", {}, t("timer_cancelled"), e.currentTarget);
  $("savePin").onclick = async (e) => {
    const pin = $("pin").value.trim();
    if (!/^[0-9]{4}$/.test(pin)) { toast(t("pin_4"), true); return; }
    if ((await run("set_pin", { text: pin }, t("pin_saved"), e.currentTarget)).ok) $("pin").value = "";
  };
  $("savePsk").onclick = (e) => savePsk($("psk"), e.currentTarget);
  $("savePsk2").onclick = (e) => savePsk($("psk2"), e.currentTarget);
  $("forget").onclick = () => {
    try { localStorage.removeItem(STORE); } catch (e) {}
    location.replace(location.pathname);
  };

  if (!standalone) {
    if (ios) {
      setT($("installHint"), "install_ios");
      $("install").hidden = false;
    }
    let prompt = null;
    addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      prompt = e;
      setT($("installHint"), "install_hint");
      $("installBtn").hidden = false;
      $("install").hidden = false;
    });
    $("installBtn").onclick = async () => {
      if (!prompt) return;
      prompt.prompt();
      await prompt.userChoice.catch(() => {});
      prompt = null;
      $("install").hidden = true;
    };
    addEventListener("appinstalled", () => ($("install").hidden = true));
  }

  $("status").style.cursor = "pointer";
  $("status").onclick = () => { setT($("statusText"), "st_checking"); connect(); refresh(); };

  setupNotify();
  connect();
  refresh();
  setInterval(() => { if (!document.hidden) { refresh(); loadReport(); } }, 60000);
  // Opened from the cache without a connection: say so, and reconnect as soon as the phone is back online.
  window.addEventListener("offline", () => setOnline(false, null));
  window.addEventListener("online", () => { backoff = 1000; connect(); refresh(); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { connect(); refresh(); }
    setLive(tab === "remote");
  });
  let start = "remote";
  try { start = sessionStorage.getItem("tvremote-tab") || "remote"; } catch (e) {}
  showTab(["remote", "message", "lock", "activity", "settings"].includes(start) ? start : "remote");
})();
</script>
</body>
</html>`;
